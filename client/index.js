// Global Variables
const contractAddress = "0x57f0B53926dd62f2E26bc40B30140AbEA474DA94";
let user, instance, web3, toWei, fromWei;

//Executed when page finish loading
$(document).ready(async () => {
  // this allows the website to use the metamask account
  const accounts = await ethereum.enable();

  web3 = new Web3(ethereum);

  toWei = (amount) => web3.utils.toWei(String(amount));
  fromWei = (amount) => Number(web3.utils.fromWei(amount)).toFixed(4);

  ethereum.on("accountsChanged", (_accounts) => {
    console.log("Account Changed!", accounts[0]);
    user = _accounts[0];
    setUserAcc();
    fetchNFTs();
  });

  // User will be the first item in the accounts array
  user = accounts[0];

  //Create vNFT instance
  instance = new web3.eth.Contract(abi, contractAddress, { from: user });

  setUserAcc();
  fetchNFTs();
});

async function fetchNFTs() {
  console.log("Fetching past events...");
  let events = await instance.getPastEvents("Transfer", {
    filter: {
      to: user,
    },
    fromBlock: 11023280,
    toBlock: "latest",
  });

  let totalOwned = 0;

  let tokens = events.map((e) => e.returnValues.tokenId);
  tokens = _.uniq(tokens);

  let tokenList = [];

  for (let i = 0; i < tokens.length; i++) {
    const tokenId = tokens[i];

    let _owner,
      _level,
      _timeUntilStarving,
      _score,
      _lastTimeMined,
      _expectedReward;

    try {
      ({
        _owner,
        _level,
        _timeUntilStarving,
        _score,
        _lastTimeMined,
        _expectedReward,
      } = await instance.methods.getVnftInfo(tokenId).call());

      if (_owner == web3.utils.toChecksumAddress(user)) {
        totalOwned++;
        const currentTime = Date.now() / 1000;

        const mineTime =
          +_lastTimeMined + 24 * 60 * 60 < currentTime
            ? "NOOOOWWW!!"
            : new Date((+_lastTimeMined + 24 * 60 * 60) * 1000).toLocaleString(
                "en-US"
              );
        const starvingTime =
          +_timeUntilStarving < currentTime
            ? "DEAD!!"
            : new Date(+_timeUntilStarving * 1000).toLocaleString("en-US");
        const timeRemaining = Math.floor(+_timeUntilStarving - currentTime);

        tokenList.push({
          tokenId,
          _level,
          _score,
          _expectedReward,
          starvingTime,
          mineTime,
          timeRemaining,
        });
      }
    } catch (error) {
      console.log(error.message);
    }
  }

  $("#user-nfts").empty();

  tokenList
    .sort((a, b) => b._level - a._level)
    .forEach((t) => {
      const tableColor = t.timeRemaining < 3600 ? "table-danger" : "";
      $("#user-nfts").append(`
        <tr class="${tableColor}">
            <th scope="row">${t.tokenId}</th>
            <td>${t._level}</td>
            <td>${t._score}</td>
            <td>${t.starvingTime}</td>
            <td>${t.mineTime}</td>
            <td>${Number(fromWei(t._expectedReward)).toFixed(2)}</td>
            <td><a href="https://gallery.verynifty.io/nft/${
              t.tokenId
            }" target="_blank">check</a></td>
        </tr>
        `);
    });

  $("#total-nfts").html(`Total: ${totalOwned}`);
}

function setUserAcc() {
  $("#account")
    .html(user.substring(0, 8) + "..." + user.substring(34, 42))
    .attr("href", `https://etherscan.io/address/${user}`);
}
