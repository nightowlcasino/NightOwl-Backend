<div id="top"></div>

<!-- project shields -->
<p align="left">
  <!-- discord -->
  <a href="http://discord.gg/W69GTHe3pJ">
    <img src="https://img.shields.io/static/v1?label=Discord&message=chat&color=5865F2&style=flat&logo=discord"/>
  </a>
  <!-- telegram -->
  <a href="https://t.me/nightowlcommunity">
    <img src="https://img.shields.io/static/v1?label=Telegram&message=chat&color=26A5E4&style=flat&logo=telegram"/>
  </a>
  <!-- reddit -->
  <a href="https://www.reddit.com/r/NightOwlCasino">
    <img src="https://img.shields.io/static/v1?label=Reddit&message=forum&color=FF4500&style=flat&logo=reddit"/>
  </a>
  <!-- mit license -->
  <a href="https://github.com/nightowlcasino/NightOwl-Backend/blob/main/LICENSE">
    <img src="https://img.shields.io/static/v1?label=License&message=MIT&color=A31F34&style=flat"/>
  </a>
</p>

<!-- logo -->
<p align="center">
  <img src="public/logo.png" alt="Logo" width="400"/>
</p>

# NightOwl-Backend

<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about">About</a>
      <ul>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li><a href="#installation">Installation</a></li>
    <li><a href="#usage">Usage</a></li>
    <li><a href="#roadmap">Roadmap</a></li>
    <li><a href="#ergo-hack-iii-goals">Ergo Hack III Goals</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#acknowledgments">Acknowledgments</a></li>
  </ol>
</details>
  
<!-- ABOUT -->
## About

The main job of the backend will be to: 

- interact with our ERG blockchain smart contracts to place user bet(s)
- interface with the ergo explorer API to collect & aggregate all TXs with our smart contracts
- store metrics from application usage & performance as well as metrics from our smart contracts to help quickly detect any issues.
- interface with external dApps & blockchains (i.e. Oracle pools, ADAHandle, etc)

### Built With

* [NodeJS](https://nodejs.org/en/)
* [Express](https://expressjs.com)
* [Typescript](https://www.typescriptlang.org)
* [MongoDB](https://www.mongodb.com)

### Why Typescript?

We decided to go with Typescript as our backend language for a few reasons. One, it appears it is becoming more popular which results in better documentation and an active community. Next, it will help us detect bugs early on and also help diagnose them in the field. I don't think anyone enjoys seeing an error stack that is not only massive but cryptic as well. Lastly, we have found that it has a better developer experience.

### Why MongoDB?

Although this application does not require any DB at all, we wanted to incorporate one to improve the user experience as well as track the performance and usage of the app. Nothing will be stored in the DB that is sensitive or compromising to any of our users. We decided to use MongoDB because of it's ability for rapid development and prototyping. It also has a sufficient redundancy model when you use clustering. 

<!-- INSTALLATION -->
## Installation

### Install nvm (Node Version Manager w/ Mac OS X)

```bash
brew install nvm
```

### Install node lts (long-term support) version
```bash
nvm install --lts
```

### Install dependencies
```bash
npm i
```

### start nodejs backend server
```bash
npm run start
```

<!-- USAGE -->
## Usage

### Test API
```bash
curl http://localhost:8080/api/v1/leaderboard
```

<!-- ROADMAP (work in progress)  -->
## Roadmap

### 2022

#### Q1
- [ ] Read and store on-chain data from coin-flip smart contract
- [ ] Place bets using browser connected wallet to coin-flip smart contract
- [ ] Figure out scalable DB Schemas for representing on-chain data for each casino game type
- [ ] Deploy dev environments to Virtual Private Servers

#### Q2
- [ ] Try to integrate with ADAHandle because of the recent partnership between ADAHandle and ERG
- [ ] Begin work on more complicated casino games (i.e. P2P betting, backjack)

Longer term goals are still being figured out

<!-- ERGOHACK3 -->
## Ergo Hack III Goals

- Integrate with ErgoMixer API to anonymize bets
- Investigate Oracle pools that can collect & aggregate betting odds from different casinos
- PoC a way to connect to Oracle pools to retreive, store, and display data

<!-- LICENSE -->
## License

MIT License, see [LICENSE](https://github.com/nightowlcasino/NightOwl-Backend/blob/main/LICENSE).

<!-- ACKNOWLEDGEMENTS -->
## Acknowledgments

This repo structure was based off of the [ergo-js-template repo](https://github.com/anon-real/ergo-js-template)

<p align="right">(<a href="#top">back to top</a>)</p>
