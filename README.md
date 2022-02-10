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
<p align="center" style='padding: 30px;'>
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

A little bit about what the backends job is

### Built With

* [Express](https://expressjs.com)
* [Typescript](https://www.typescriptlang.org)
* [MongoDB](https://www.mongodb.com)

### Why Typescript?

### Why MongoDB?

<!-- INSTALLATION -->
## Installation

### Install nvm (Mac OS X - Node Version Manager)

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

<!-- ROADMAP -->
## Roadmap

### 2022

#### Q1
- [ ] Read and store on-chain data from coin-flip smart contract
- [ ] Place bets using browser connected wallet to coin-flip smart contract
- [ ] Figure out scalable DB Schemas for representing on-chain data for each casino game type
- [ ] Deploy dev environments to Virtual Private Servers

#### Q2
- [ ] Connect front-end with back-end applications
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