import { Account, Add } from './teachersremark.js';
import {
  AccountUpdate,
  Field,
  MerkleTree,
  MerkleWitness,
  Mina,
  PrivateKey,
  Signature,
  UInt32,
} from 'o1js';

type Names = 'Radhe' | 'Krishn' | 'Bob' | 'Alice' | 'Charlie' | 'Olivia';
const doProofs = true;

class MyMerkleWitness extends MerkleWitness(8) {}

const Local = Mina.LocalBlockchain({ proofsEnabled: doProofs });
Mina.setActiveInstance(Local);
const initialBalance = 10_000_000_000;

let feePayerKey = Local.testAccounts[0].privateKey;
let feePayer = Local.testAccounts[0].publicKey;

let zkappKey = PrivateKey.random();
let zkappAddress = zkappKey.toPublicKey();

// this map serves as our off-chain in-memory storage
let Accounts: Map<string, Account> = new Map<Names, Account>(
  ['Radhe', 'Krishn', 'Bob', 'Alice', 'Charlie', 'Olivia'].map(
    (name: string, index: number) => {
      return [
        name as Names,
        new Account({
          stdPublicKey: Local.testAccounts[index].publicKey,
          marks: UInt32.from(0),
        }),
      ];
    }
  )
);

// we initialize a new Merkle Tree with height 8
const Tree = new MerkleTree(8);
Tree.setLeaf(0n, Accounts.get('Radhe')!.hash());
Tree.setLeaf(1n, Accounts.get('Krishn')!.hash());
Tree.setLeaf(2n, Accounts.get('Bob')!.hash());
Tree.setLeaf(3n, Accounts.get('Alice')!.hash());
Tree.setLeaf(4n, Accounts.get('Charlie')!.hash());
Tree.setLeaf(5n, Accounts.get('Olivia')!.hash());

let initialCommitment: Field = Tree.getRoot();

let teachersremark = new Add(zkappAddress);
console.log('Deploying Contract .....');

if (doProofs) {
  await Add.compile();
}

let tx = await Mina.transaction(feePayer, () => {
  AccountUpdate.fundNewAccount(feePayer).send({
    to: zkappAddress,
    amount: initialBalance,
  });
  teachersremark.deploy();
  teachersremark.initState(feePayer, initialCommitment);
});
await tx.prove();
await tx.sign([feePayerKey, zkappKey]).send();

console.log('Contract Deployed....');
console.log('Initial marks: ' + Accounts.get('Radhe')?.marks);

console.log(
  `Now let the SSC board add some Marks... (sshhhhh!! We are gonna fail some Students!!)`
);

await addMarks('Radhe', 100, 0n);
await addMarks('Krishn', 100, 1n);
await addMarks('Bob', 10, 2n);

console.log(
  `Marks added!! Radhe : ${Accounts.get('Radhe')?.marks} and Krishn : ${
    Accounts.get('Krishn')?.marks
  } and Bob ${Accounts.get('Bob')?.marks}`
);

// Let's verify if you have pass
// await verifyIfPass('Radhe', 0n);
await verifyIfPass('Krishn', 1n);
// await verifyIfPass('Bob', 2n);

async function verifyIfPass(name: Names, index: bigint) {
  let account = Accounts.get(name)!;

  // Create the witness from for the index from the merkle tree.
  let w = Tree.getWitness(index);
  let witness = new MyMerkleWitness(w);

  let sig = Signature.create(feePayerKey, account.stdPublicKey.toFields());

  try {
    const [passORfail, ok] = teachersremark.verifyIfPass(
      feePayer,
      account,
      witness,
      sig
    );

    if (ok.toBoolean()) {
      console.log(
        `Hmm... Signature is legit, now let's see if he has passed or not !!`
      );
      if (passORfail.toBoolean()) {
        console.log(`Dude, ${name} has proof he has passed !!!`);
      } else {
        console.log(`Ohhh!!! Better luck next time ${name} :)`);
      }
    } else {
      console.log(
        `Hmm... Signature is not legit!! You are a liar, imposter person ${name}!!`
      );
    }
  } catch (e: any) {
    console.log('Here Here!' + e.message);
  }
}

async function addMarks(name: Names, marks: number, index: bigint) {
  let account = Accounts.get(name)!;

  // Create the witness from for the index from the merkle tree.
  let w = Tree.getWitness(index);
  let witness = new MyMerkleWitness(w);

  // Create a Transaction with guess, account and witness. Send the transaction.
  try {
    let tx = await Mina.transaction(feePayer, () => {
      teachersremark.addMarks(
        feePayerKey,
        account,
        UInt32.from(marks),
        witness
      );
    });
    await tx.prove();
    await tx.sign([feePayerKey, zkappKey]).send();
  } catch (e: any) {
    console.log(e.message);
  }

  // if the transaction was successful, we can update our off-chain storage as well
  account.marks = account.marks.add(marks);
  Tree.setLeaf(index, account.hash());
  teachersremark.commitment.get().assertEquals(Tree.getRoot());
}
