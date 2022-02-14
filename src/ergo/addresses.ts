import { SIGMA_CONSTANT_PK_MATCHER, P2PK_TREE_PREFIX } from "../constants/ergo";
import { Registers, UnsignedInput } from "../types/connector";
import { wasmModule } from "../utils/wasm-module";
import { Address } from "@coinbarn/ergo-ts";
import { isEmpty, uniq } from "lodash";

export function extractAddressesFromInputs(inputs: UnsignedInput[]) {
  return inputs.map((input) => extractAddressesFromInput(input)).flat();
}

export function addressFromPk(pk: string) {
  return Address.fromPk(pk).address;
}

export function addressFromErgoTree(ergoTree: string) {
  return Address.fromErgoTree(ergoTree).address;
}

export function addressFromSk(sk: string) {
  return Address.fromSk(sk).address;
}

function extractAddressesFromInput(input: UnsignedInput): string[] {
  if (input.ergoTree.startsWith(P2PK_TREE_PREFIX)) {
    return [addressFromErgoTree(input.ergoTree)];
  }

  let pks = extractPksFromP2SErgoTree(input.ergoTree);
  if (input.additionalRegisters) {
    pks = pks.concat(extractPksFromRegisters(input.additionalRegisters));
  }

  if (isEmpty(pks)) {
    throw new Error(`Input ${input.boxId} is a P2S, but no address is found!`);
  }

  const addresses: string[] = [];
  for (const pk of uniq(pks)) {
    addresses.push(addressFromPk(pk));
  }

  return addresses;
}

function extractPksFromRegisters(registers: Registers): string[] {
  const pks: string[] = [];
  for (const register of Object.values(registers)) {
    const pk = extractPkFromSigmaConstant(register);
    if (pk) {
      pks.push(pk);
    }
  }

  return pks;
}

function extractPksFromP2SErgoTree(ergoTree: string): string[] {
  const pks: string[] = [];
  const tree = wasmModule.SigmaRust.ErgoTree.from_base16_bytes(ergoTree);
  const constantsLen = tree.constants_len();
  for (let i = 0; i < constantsLen; i++) {
    const constant = tree.get_constant(i)?.encode_to_base16();
    const pk = extractPkFromSigmaConstant(constant);
    if (pk) {
      pks.push(pk);
    }
  }

  return pks;
}

function extractPkFromSigmaConstant(constant?: string): string | undefined {
  if (!constant) {
    return;
  }

  const result = SIGMA_CONSTANT_PK_MATCHER.exec(constant);
  return result ? result[1] : undefined;
}
