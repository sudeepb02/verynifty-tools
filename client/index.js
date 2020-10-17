// Global Variables
const contractAddress = "0x57f0B53926dd62f2E26bc40B30140AbEA474DA94";
let user, instance, web3, toWei, fromWei;
const { flow, partialRight: pr, keyBy, values } = _;
const lastUniqBy = (iteratee) => flow(pr(keyBy, iteratee), values);
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const CREATION_BLOCK = 11023280;
const ONE_DAY = 24 * 60 * 60;
const MIN_TIME = 6 * 60 * 60; // 6 hours
const BLOCK_TIME = 13;
let userNFTs = [];
let scanned = false;
let totalEvents = 0;

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
    userNFTs = [];
    fetchNFTs();
  });

  // User will be the first item in the accounts array
  user = accounts[0];

  //Create vNFT instance
  instance = new web3.eth.Contract(abi, contractAddress, { from: user });

  setUserAcc();

  $("#user-nfts").append("Loading...");
  fetchNFTs();
});

async function fetchNFTs() {
  let tokens;

  if (userNFTs.length === 0) {
    let events = await instance.getPastEvents("Transfer", {
      filter: {
        to: user,
      },
      fromBlock: CREATION_BLOCK,
      toBlock: "latest",
    });

    let totalOwned = 0;

    tokens = events.map((e) => e.returnValues.tokenId);
    tokens = _.uniq(tokens);

    if (tokens.length === 0) {
      alert("No tokens found!");
    }

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
              : new Date(
                  (+_lastTimeMined + 24 * 60 * 60) * 1000
                ).toLocaleString("en-US");
          const starvingTime =
            +_timeUntilStarving < currentTime
              ? "DEAD!!"
              : new Date(+_timeUntilStarving * 1000).toLocaleString("en-US");
          const timeRemaining = Math.floor(+_timeUntilStarving - currentTime);

          userNFTs.push({
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

    userNFTs
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

    const totalRewards = userNFTs
      .map((t) => +fromWei(t._expectedReward))
      .reduce((a, b) => a + b);

    $("#user-nfts").append(`
        <tr class="table-info">
            <th scope="row"></th>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td class="font-weight-bold">${Number(totalRewards).toFixed(2)}</td>
            <td></td>
        </tr>
        `);

    $("#total-nfts").html(`Total: ${totalOwned}`);
  }
}

function getItemTime(id) {
  switch (parseInt(id)) {
    case 1:
      return 259200;
    case 2:
      return 172800;
    case 3:
      return 345600;
    case 4:
      return 86400;
    case 5:
      return 604800;
    default:
      return 0;
  }
}

async function scanMarket() {
  if (!scanned) {
    $("#scan-nfts").html("Loading...");

    const currentBlock = await web3.eth.getBlockNumber();
    const currentTime = Date.now() / 1000;

    const mintEvents = await instance.getPastEvents("Transfer", {
      filter: {
        from: ZERO_ADDRESS,
      },
      fromBlock: CREATION_BLOCK,
      toBlock: "latest",
    });

    let consumeEvents = await instance.getPastEvents("VnftConsumed", {
      fromBlock: CREATION_BLOCK,
      toBlock: "latest",
    });

    consumeEvents = consumeEvents.map((t) => {
      return {
        block: t.blockNumber,
        txHash: t.transactionHash,
        ...t.returnValues,
      };
    });

    consumeEvents = lastUniqBy("nftId")(consumeEvents);

    const deadIds = [];
    const soonIds = [];

    for (let i = 0; i < mintEvents.length - 1; i++) {
      const { tokenId } = mintEvents[i].returnValues;

      const consumed = consumeEvents.filter((t) => t.nftId == tokenId)[0];

      // If token has not consumed Items
      if (!consumed) {
        const mintTimeAprox =
          (currentBlock - mintEvents[i].blockNumber) * BLOCK_TIME;

        // if it was minted more than 3 days ago
        if (mintTimeAprox > 3 * ONE_DAY) deadIds.push(tokenId);
      } else {
        const timeExtended = getItemTime(consumed.itemId);
        const aproxTimeAgo = (+currentBlock - consumed.block) * BLOCK_TIME;

        if (aproxTimeAgo > timeExtended) deadIds.push(tokenId);
        // This filters all other events, so we only query the blockchain
        // for the "suspicious" ones
        else if (aproxTimeAgo > timeExtended - MIN_TIME) {
          try {
            const {
              _level,
              _timeUntilStarving,
              _score,
              _expectedReward,
            } = await instance.methods.getVnftInfo(tokenId).call();
            console.log(
              `Token ${tokenId} dying soon! ${new Date(
                +_timeUntilStarving * 1000
              )} (${Math.floor(+_timeUntilStarving - currentTime)} sec)`
            );

            const starvingTime =
              +_timeUntilStarving < currentTime
                ? "DEAD!!"
                : new Date(+_timeUntilStarving * 1000).toLocaleString("en-US");

            soonIds.push({
              tokenId,
              _score,
              _level,
              _expectedReward,
              starvingTime,
              timeRemaining:
                +_timeUntilStarving > currentTime
                  ? +_timeUntilStarving - currentTime
                  : 0,
            });
          } catch (error) {
            console.log("Dead", tokenId);
          }
        }
      }
    }

    $("#market-info").append(`
      <p>Minted: ${mintEvents.length}</p>
      <p>Items consumed: ${consumeEvents.length}</p>
      <p>vNFTs dying soon: ${soonIds.length}</p>
      <p>vNFTs dead: ${deadIds.length}</p>
    `);

    $("#scan-nfts").empty();

    soonIds
      .sort((a, b) => a.timeRemaining - b.timeRemaining)
      .forEach((t) => {
        let tableColor = "";

        if (t.timeRemaining < 3600) tableColor = "table-warning";
        if (t._score > 1000) tableColor = "table-danger";

        let link = `<td><a href="https://gallery.verynifty.io/nft/${t.tokenId}" target="_blank">check</a></td>`;

        if (t.timeRemaining === 0)
          link = `<td><a href="#" onclick="killNFT(${t.tokenId})">kill!</a></td>`;
        $("#scan-nfts").append(`
          <tr class="${tableColor}">
              <th scope="row">${t.tokenId}</th>
              <td>${t._level}</td>
              <td>${t._score}</td>
              <td>${t.starvingTime}</td>
              ${link}
          </tr>
          `);
      });

    console.log("\n===Summary===\n");
    console.log("Total tokens minted:", mintEvents.length);
    console.log("Total items consumed:", consumeEvents.length);
    console.log("Total NFTs dying soon:", soonIds.length);

    scanned = true;
  }
}

async function killNFT(id) {
  const recipientId = Number(
    prompt(
      "Please enter the ID of the token receiving the rewards",
      "Your Token ID"
    )
  );
  try {
    const reward = await instance.methods.getFatalityReward(recipientId).call();

    if (reward > 0) await instance.methods.fatality(id, recipientId).send({});
    else alert("Error: vNFT is not dead or not enough score");
  } catch (error) {
    console.log(error.message);
  }
}

function renderEvent(event, txHash) {
  totalEvents++;
  return $("#events-nfts").append(`
    <tr>
      <th scope="row">${totalEvents}</th>
      <td>${event}</td>
      <td><a href="https://etherscan.io/tx/${txHash}" target="_blank">check</a></td>
    </tr>
  `);
}

async function checkEvents() {
  totalEvents = 0;
  const block = await web3.eth.getBlockNumber();
  $("#events-nfts").empty();

  let mintEvents = await instance.getPastEvents("Transfer", {
    filter: {
      from: ZERO_ADDRESS,
    },
    fromBlock: block - 1000,
    toBlock: "latest",
  });
  console.log(mintEvents[0]);
  mintEvents = mintEvents.map((e) => {
    return { name: "Minted", txHash: e.transactionHash, block: e.blockNumber };
  });

  let fatalityEvents = await instance.getPastEvents("VnftFatalized", {
    fromBlock: block - 1000,
    toBlock: "latest",
  });
  fatalityEvents = fatalityEvents.map((e) => {
    return { name: "Killed", txHash: e.transactionHash, block: e.blockNumber };
  });

  let consumeEvents = await instance.getPastEvents("VnftConsumed", {
    fromBlock: block - 1000,
    toBlock: "latest",
  });
  consumeEvents = consumeEvents.map((e) => {
    return {
      name: "Item Consumed",
      txHash: e.transactionHash,
      block: e.blockNumber,
    };
  });

  const totalEvents = mintEvents.concat(fatalityEvents).concat(consumeEvents);

  totalEvents
    .sort((a, b) => b.block - a.block)
    .forEach((e) => renderEvent(e.name, e.txHash));
}

function setUserAcc() {
  $("#account")
    .html(user.substring(0, 8) + "..." + user.substring(34, 42))
    .attr("href", `https://etherscan.io/address/${user}`);
}

// NAVIGATION

$("#eventsLink").click(() => {
  $("#scanner-container, #nft-container").hide();
  $("#scannerLink, #homeLink").removeClass("active");

  $("#eventsLink").addClass("active");
  $("#events-container").show();

  checkEvents();
});

$("#scannerLink").click(() => {
  $("#nft-container, #events-container").hide();
  $("#homeLink, #eventsLink").removeClass("active");

  $("#scannerLink").addClass("active");
  $("#scanner-container").show();

  scanMarket();
});

$("#homeLink").click(() => {
  $("#scanner-container, #events-container").hide();
  $("#scannerLink, #eventsLink").removeClass("active");

  $("#homeLink").addClass("active");
  $("#nft-container").show();
});
