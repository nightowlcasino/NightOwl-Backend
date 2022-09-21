export class Leaderboard {

  public address: string;
  public amount: string;
  public txId: string;

  constructor(
    address: string,
    amount: string,
    txId: string
  ) {
    this.address = address
    this.amount = amount
    this.txId = txId
  }

  public static fromJson(userJson: any): Leaderboard {
    var topspot = new Leaderboard(
      userJson.address,
      userJson.amount,
      userJson.txId
    );

    return topspot;
  }
}