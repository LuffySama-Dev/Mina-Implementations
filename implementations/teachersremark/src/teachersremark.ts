import { publicKey } from '@project-serum/anchor/dist/cjs/utils';
import {
  Field,
  SmartContract,
  state,
  State,
  method,
  MerkleWitness,
  PublicKey,
  PrivateKey,
  Struct,
  UInt32,
  Poseidon,
  Bool,
  provable,
  Provable,
  verify,
  Signature,
} from 'o1js';

class MerkleWitness8 extends MerkleWitness(8) {}

export class Account extends Struct({
  stdPublicKey: PublicKey,
  marks: UInt32,
}) {
  hash(): Field {
    return Poseidon.hash(Account.toFields(this));
  }

  addMarks(marks: UInt32) {
    return new Account({
      stdPublicKey: this.stdPublicKey,
      marks: this.marks.add(marks),
    });
  }
}

export class Add extends SmartContract {
  // We need this for getting the value
  @state(Bool) isPass = State<boolean>();
  @state(Bool) isFail = State<boolean>();

  // Maharashtra Board of Examination: SSC (State Board Of Secondary School Certificate). (India)
  @state(PublicKey)
  sscPublicKey = State<PublicKey>();

  // This is the root of our merkle tree. This will be set during deployment.
  // As Students number are fixed so we don't need to add them again and again, we will add them at once during deployment.
  @state(Field) commitment = State<Field>();

  // initState method: Here initialising the root and the Public key i.e the Deployer Key
  // Initial commitment will come during the deployment. The Account will already have Student's name and their public key
  @method initState(sscPublicKey: PublicKey, initialCommitment: Field) {
    super.init();
    this.sscPublicKey.set(sscPublicKey);
    this.commitment.set(initialCommitment);
  }

  // This method will add the marks and associate it to related public key
  // Instead of going and updating the value of the old public key, we will add a new account keeping public key same but changing the marks.
  @method addMarks(
    sscPrivateKey: PrivateKey,
    account: Account,
    marks: UInt32,
    path: MerkleWitness8
  ) {
    // Here we are making sure that only SSC board should be able to invoke this function.
    // As Public key is available to everyone anyone can use it.
    // So, we are going to take the private key as the input.
    // Then we will check whether the public key that is derived from the private key is same as what has been passed earlier

    // Circuit Assertion: Getting the public key stored in contract and making sure the new variable has the same
    const commitedPublicKey = this.sscPublicKey.get();
    this.sscPublicKey.assertEquals(commitedPublicKey);

    // Deriving from private key and checking if it is matching to public key
    commitedPublicKey.assertEquals(sscPrivateKey.toPublicKey());

    // Now let's fetch the on-chain commitment
    let commitment = this.commitment.get();
    this.commitment.assertEquals(commitment);

    // Let's check if the account is present in the merkle tree
    path.calculateRoot(account.hash()).assertEquals(commitment);

    // If it matching then we can add the marks to the account
    let newAccount = account.addMarks(marks);

    // we calculate the new Merkle Root, based on the account changes
    let newCommitment = path.calculateRoot(newAccount.hash());

    // Now we will update the existing commitment with the new commitment
    this.commitment.set(newCommitment);
  }

  @method verifyIfPass(
    sscPublicKey: PublicKey,
    account: Account,
    path: MerkleWitness8,
    signature: Signature
  ): [Bool, Bool] {
    const y = Field(80);

    // Now let's fetch the on-chain commitment
    let commitment = this.commitment.get();
    this.commitment.assertEquals(commitment);

    // Let's check if the account is present in the merkle tree
    path.calculateRoot(account.hash()).assertEquals(commitment);

    const ok = signature.verify(sscPublicKey, account.stdPublicKey.toFields());
    ok.assertTrue();

    let passORfail = account.marks.greaterThanOrEqual(UInt32.from(y));

    return [passORfail, ok];
  }
}
