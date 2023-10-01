// import { LeaderBoard, Account } from './Guess.js';
// import {
//   Field,
//   Mina,
//   PrivateKey,
//   PublicKey,
//   AccountUpdate,
//   MerkleTree,
//   UInt32,
//   MerkleWitness,
// } from 'o1js';

// describe('LeaderBoard', () => {
//   let deployerAccount: PublicKey,
//     deployerKey: PrivateKey,
//     feePayer: PublicKey,
//     feePayerKey: PrivateKey,
//     zkappAddress: PublicKey,
//     zkappKey: PrivateKey,
//     zkAppPrivateKey: PrivateKey,
//     leaderboardZkApp: LeaderBoard,
//     initialCommitment: Field = Field(0),
//     Accounts: Map<string, Account>;
//   const Tree = new MerkleTree(8);
//   let initialBalance = 10_000_000_000;
//   type Names = 'Bob' | 'Alice' | 'Charlie' | 'Olivia';
//   let proofsEnabled = true;

//   beforeEach(async () => {
//     const height = 8;

//     const Local = Mina.LocalBlockchain({ proofsEnabled });
//     Mina.setActiveInstance(Local);

//     feePayerKey = Local.testAccounts[0].privateKey;
//     feePayer = Local.testAccounts[0].publicKey;

//     ({ privateKey: deployerKey, publicKey: deployerAccount } =
//       Local.testAccounts[0]);
//     // ({ privateKey: senderKey, publicKey: senderAccount } =
//     //   Local.testAccounts[1]);

//     // the zkapp account
//     let zkappKey = PrivateKey.random();
//     let zkappAddress = zkappKey.toPublicKey();

//     // this map serves as our off-chain in-memory storage
//     Accounts = new Map<Names, Account>(
//       ['Bob', 'Alice', 'Charlie', 'Olivia'].map(
//         (name: string, index: number) => {
//           return [
//             name as Names,
//             new Account({
//               publicKey: Local.testAccounts[index].publicKey,
//               points: UInt32.from(0),
//             }),
//           ];
//         }
//       )
//     );

//     Tree.setLeaf(0n, Accounts.get('Bob')!.hash());
//     Tree.setLeaf(1n, Accounts.get('Alice')!.hash());
//     Tree.setLeaf(2n, Accounts.get('Charlie')!.hash());
//     Tree.setLeaf(3n, Accounts.get('Olivia')!.hash());

//     // now that we got our accounts set up, we need the commitment to deploy our contract!
//     initialCommitment = Tree.getRoot();
//     leaderboardZkApp = new LeaderBoard(zkappAddress);
//   });

//   async function localDeploy() {
//     console.log('Deploying leaderboard..');
//     if (proofsEnabled) await LeaderBoard.compile();

//     let tx = await Mina.transaction(deployerAccount, () => {
//       AccountUpdate.fundNewAccount(deployerAccount).send({
//         to: zkappAddress,
//         amount: initialBalance,
//       });
//       leaderboardZkApp.deploy();
//     });

//     await tx.prove();
//     await tx.sign([deployerKey, zkappKey]).send();
//     console.log('Deploying 2');
//   }

//   async function makeGuess(name: Names, index: bigint, guess: number) {
//     class MyMerkleWitness extends MerkleWitness(8) {}
//     let account = Accounts.get(name)!;
//     let w = Tree.getWitness(index);
//     let witness = new MyMerkleWitness(w);

//     let tx = await Mina.transaction(feePayer, () => {
//       leaderboardZkApp.guessPreImage(Field(guess), account, witness);
//     });
//     await tx.prove();
//     await tx.sign([feePayerKey, zkappKey]).send();

//     // if the transaction was successful, we can update our off-chain storage as well
//     account.points = account.points.add(1);
//     Tree.setLeaf(index, account.hash());
//     leaderboardZkApp.commitment.get().assertEquals(Tree.getRoot());
//   }

//   it('generates and deploys the `Guess` smart contract', async () => {
//     await localDeploy();
//     console.log('Initial points: ' + Accounts.get('Bob')?.points);
//     console.log('Making guess..');
//     await makeGuess('Bob', 0n, 22);
//     let result = 'Final points: ' + Accounts.get('Bob')?.points;
//     console.log('Final points: ' + Accounts.get('Bob')?.points);

//     expect(result).toEqual('Final points: 1');
//   });
// });
