import { TOKENID_FAKE_OWL, TOKENID_FAKE_LP } from "../constants/ergo"

export class Liquidity {

  public owlAmount: number = 0
  public lpAmount?: number
  public nanoErgs?: number
  public tokens?: Array<Token>

  constructor(
    owlAmount: number,
    lpAmount?: number,
    nanoErgs?: number,
    tokens?: Array<Token>
  ) {
    this.owlAmount = owlAmount
    this.lpAmount = lpAmount
    this.nanoErgs = nanoErgs
    this.tokens = tokens
  }

  public static fromJson(json: any): Liquidity {
    let tokens = new Array<Token>()
    let owlAmnt: number = 0
    let lpAmnt: number = 0
    // construct Array<Token> first
    json.tokens.forEach((token: any) => {
      tokens.push(new Token(
        token.tokenId,
        token.amount,
        token.decimals,
        token.name,
        token.tokenType
      ))

      if (token.tokenId === TOKENID_FAKE_OWL) {
        owlAmnt = token.amount
      } else if (token.tokenId === TOKENID_FAKE_LP) {
        lpAmnt = token.amount
      }
    })

    var lq = new Liquidity(
      owlAmnt,
      lpAmnt,
      Number(json.nanoErgs),
      tokens
    );

    return lq;
  }
}

export class Token {

  public tokenId: string
  public amount: number
  public decimals: number
  public name: string
  public tokenType: string

  constructor(
    tokenId: string,
    amount: number,
    decimals: number,
    name: string,
    tokenType: string
  ) {
    this.tokenId = tokenId
    this.amount = amount
    this.decimals = decimals
    this.name = name
    this.tokenType = tokenType
  }

  public static fromJson(json: any): Token {
    var token = new Token(
      json.tokenId,
      Number(json.amount),
      Number(json.decimals),
      json.name,
      json.tokenType
    );

    return token;
  }
}
