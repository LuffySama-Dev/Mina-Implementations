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
  Signature,
} from 'o1js';

class MerkleWitness4 extends MerkleWitness(4) {}

export class Add extends SmartContract {
  @state(Field) nextIndex = State<Field>();

  // Ontario Association of the Medical Doctors (Canada)
  @state(PublicKey) cpsoPublicKey = State<PublicKey>();

  // We use Field instead on an Int64 because there's a limit on the range of values allowable in O1js. It has to do with the circuit that's generated at compile time.
  @state(Field) root = State<Field>();

  @method initState(cpsoPublicKey: PublicKey, initRoot: Field) {
    this.cpsoPublicKey.set(cpsoPublicKey);
    this.root.set(initRoot);
    this.nextIndex.set(Field(0));
  }

  @method addDoctor(
    cpsoPrivateKey: PrivateKey,
    doctor: PublicKey,
    leafWitness: MerkleWitness4
  ) {
    // Circuit Assertion : Here we are making sure that cpsoPublicKey shared in param is smae as the one that was added while initialisation
    const commitedPublicKey = this.cpsoPublicKey.get();
    this.cpsoPublicKey.assertEquals(commitedPublicKey);

    // Check that the public key is the same as the one that is derived from the private key
    commitedPublicKey.assertEquals(cpsoPrivateKey.toPublicKey());

    // Get the initial root of the merkle tree and make sure it is same as the one that was set during initialisation
    const initialRoot = this.root.get();
    this.root.assertEquals(initialRoot);

    // Here we are calculating the index of the leaf of the merkle tree and then making sure it is equal to nextIndex set at the initialisation
    this.nextIndex.assertEquals(leafWitness.calculateIndex());

    // After all the verifiation is completed, calculate the new root and set the new root.
    // ToDo: Use Posedion hash for doctor.x
    const newRoot = leafWitness.calculateRoot(doctor.x);
    this.root.set(newRoot);

    // Get the current index and make sure is same as the initial index and then update the next index with one.
    const currIndex = this.nextIndex.get();
    this.nextIndex.assertEquals(currIndex);
    this.nextIndex.set(currIndex.add(Field(1)));
  }

  @method verifySickNote(
    doctorWitness: MerkleWitness4,
    doctorPubKey: PublicKey,
    signature: Signature,
    patientPubKey: PublicKey
  ) {
    // Verify that doctor is in the list of the doctors
    this.root.assertEquals(doctorWitness.calculateRoot(doctorPubKey.x));

    const ok = signature.verify(doctorPubKey, patientPubKey.toFields());
    ok.assertTrue();
  }
}
