
export class Liquidity {

  public amount: number

  constructor(
    amount: number,
  ) {
    this.amount = amount
  }

  public static fromJson(userJson: any): Liquidity {
    var lq = new Liquidity(
      Number(userJson.amount),
    );

    return lq;
  }
}
