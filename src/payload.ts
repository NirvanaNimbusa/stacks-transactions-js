import { 
  COINBASE_BUFFER_LENGTH_BYTES,
  PayloadType,
  AssetType
} 
from './constants';

import {
  BufferArray,
  BufferReader,
  bigIntToHexString,
  hexStringToBigInt,
} from './utils';

import {
  Address,
  LengthPrefixedString,
  CodeBodyString,
  AssetInfo
} from './types';

import {
  StacksMessage,
} from './message'

export class Payload extends StacksMessage {
  payloadType: PayloadType;

  assetType: AssetType;
  assetInfo: AssetInfo;
  assetName: LengthPrefixedString;
  recipientAddress: Address;
  amount: BigInt;
  memo: LengthPrefixedString;

  contractAddress: Address;
  contractName: LengthPrefixedString;
  functionName: LengthPrefixedString;
  functionArgs: string[];

  codeBody: CodeBodyString;

  coinbaseBuffer: Buffer;

  serialize(): Buffer {
    let bufferArray: BufferArray = new BufferArray();

    bufferArray.appendHexString(this.payloadType);
    
    switch (this.payloadType) {
      case PayloadType.TokenTransfer:
        bufferArray.appendHexString(this.assetType);
        if (this.assetType == AssetType.Fungible || 
          this.assetType == AssetType.NonFungible) {
            if (!this.assetInfo) {
              throw new Error('Fungible/Non-fungible token transfer requires asset info');
            } 
            bufferArray.push(this.assetInfo.serialize());
          }
        if (this.assetType == AssetType.NonFungible) {
          if (!this.assetName) {
            throw new Error('Non-fungible token transfer requires asset name');
          } 
          bufferArray.push(this.assetName.serialize());
        }
        bufferArray.push(this.recipientAddress.serialize());
        bufferArray.appendHexString(bigIntToHexString(this.amount));
        break;
      case PayloadType.ContractCall:
        bufferArray.push(this.contractAddress.serialize());
        bufferArray.push(this.contractName.serialize());
        bufferArray.push(this.functionName.serialize());
        // TODO: serialize function args
        break;
      case PayloadType.SmartContract:
        bufferArray.push(this.contractName.serialize());
        bufferArray.push(this.codeBody.serialize());
        break;
      case PayloadType.PoisonMicroblock:
        // TODO: implement
        break;
      case PayloadType.Coinbase:
        if (this.coinbaseBuffer.byteLength != COINBASE_BUFFER_LENGTH_BYTES) {
          throw Error('Coinbase buffer size must be ' + COINBASE_BUFFER_LENGTH_BYTES + ' bytes');
        }
        bufferArray.push(this.coinbaseBuffer);
        break;
      default:
        break;
    }

    return bufferArray.concatBuffer();
  }

  deserialize(bufferReader: BufferReader) {
    this.payloadType = bufferReader.read(1).toString("hex") as PayloadType;
    switch (this.payloadType) {
      case PayloadType.TokenTransfer:
        this.assetType = bufferReader.read(1).toString("hex") as AssetType;

        if (this.assetType == AssetType.Fungible || 
          this.assetType == AssetType.NonFungible) {
          this.assetInfo = AssetInfo.deserialize(bufferReader);
        }

        if (this.assetType == AssetType.NonFungible) {
          this.assetName = LengthPrefixedString.deserialize(bufferReader);
        }

        this.recipientAddress = Address.deserialize(bufferReader);
        let amount = bufferReader.read(8).toString('hex');
        this.amount = hexStringToBigInt(amount);
        break;
      case PayloadType.ContractCall:
        this.contractAddress = Address.deserialize(bufferReader);
        this.contractName = LengthPrefixedString.deserialize(bufferReader);
        this.functionName = LengthPrefixedString.deserialize(bufferReader); 
        // TODO: deserialize function args
        break;
      case PayloadType.SmartContract:
        this.contractName = LengthPrefixedString.deserialize(bufferReader);
        this.codeBody = CodeBodyString.deserialize(bufferReader);
        break;
      case PayloadType.PoisonMicroblock:
        // TODO: implement
        break;
      case PayloadType.Coinbase:
        this.coinbaseBuffer = bufferReader.read(COINBASE_BUFFER_LENGTH_BYTES);
        break;
      default:
        break;
    }
  };
}

export class TokenTransferPayload extends Payload {
  constructor(
    recipientAddress?: string, 
    amount?: BigInt, 
    memo?: string, 
    assetType?: AssetType,
    assetInfo?: AssetInfo,
    assetName?: string
  ) {
    super();
    this.payloadType = PayloadType.TokenTransfer;
    this.assetType = assetType || AssetType.STX;
    this.recipientAddress = new Address(recipientAddress);
    this.amount = amount;
    this.memo = memo && new LengthPrefixedString(memo);
    this.assetInfo = assetInfo;
    this.assetName = assetName && new LengthPrefixedString(assetName);
  }
}

export class ContractCallPayload extends Payload {
  constructor(
    contractAddress?: string, 
    contractName?: string, 
    functionName?: string, 
    functionArgs?: string[],
  ) {
    super();
    this.payloadType = PayloadType.ContractCall;
    this.contractAddress = new Address(contractAddress);
    this.contractName = new LengthPrefixedString(contractName);
    this.functionName = new LengthPrefixedString(functionName);
    this.functionArgs = functionArgs;
  }
}

export class SmartContractPayload extends Payload {
  constructor(
    contractName?: string, 
    codeBody?: string
  ) {
    super();
    this.payloadType = PayloadType.SmartContract;
    this.contractName = new LengthPrefixedString(contractName);
    this.codeBody = new CodeBodyString(codeBody); // code body max length?
  }
}

export class PoisonPayload extends Payload {
  constructor() {
    super();
    this.payloadType = PayloadType.PoisonMicroblock;
  }
}

export class CoinbasePayload extends Payload {
  constructor(coinbaseBuffer?: Buffer) {
    super();
    this.payloadType = PayloadType.Coinbase;
    this.coinbaseBuffer = coinbaseBuffer;
  }
}