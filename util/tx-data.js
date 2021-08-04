const md5 = require('@xn-02f/md5');
const getBithompUsername = require('../services/bithomp').getBithompUsername;
const getXRPEmailHash = require('../services/xrpscan').getXRPEmailHash;

const isBlacklisted = require('./is-blacklisted');
const isWhitelisted = require('./is-whitelisted');

// Convert memo data hex to string
function hex2String(hex) {
  // convert to string
  const hexString = hex.toString();
  // initialize result variable
  var result = '';

  // derive characters from hex string
  for (
    var i = 0;
    i < hexString.length && hexString.substr(i, 2) !== '00';
    i += 2
  ) {
    result += String.fromCharCode(parseInt(hexString.substr(i, 2), 16));
  }
  // console.log('result: ', result);
  return result;
}

function string2Hex(str) {
  // convert string into buffer
  let bufStr = Buffer.from(str, 'utf8');

  // convert buffer to hex string
  const hexString = bufStr.toString('hex');

  // console.log('hexString: ', hexString);
  return hexString;
}

// parse memos field and get memo data
function parseMemoData(txMemos) {
  const memoData = txMemos[0].Memo.MemoData;

  const parsedMemo = hex2String(memoData);

  return parsedMemo;
}

// convert date field
function getTimestamp(date) {
  const unixDate = date + 946684800;
  const timestamp = new Date(unixDate * 1000);
  // console.log('timestamp: ', timestamp);
  return timestamp;
}

// derive post data from transaction
async function getPostData({ Account, Amount, date, hash, Memos }) {
  // console.log('hash: ', hash);
  try {
    // get username
    const username = await getBithompUsername(Account);

    // generate Gravatar URL
    const xrpEmailHash = await getXRPEmailHash(Account);

    const emailHash = xrpEmailHash ? xrpEmailHash.toLowerCase() : md5(Account);

    const gravatarURL = `https://www.gravatar.com/avatar/${emailHash}?s=40&d=retro`;
    // console.log('gravatar: ', gravatarURL);

    // determine display amount
    const amount = Amount.currency
      ? `${Amount.value} ${Amount.currency}`
      : `${parseInt(Amount) / 1000000} XRP`;

    // post data object
    const data = {
      account: Account,
      amount,
      date: getTimestamp(date),
      gravatarURL,
      hash,
      memoData: parseMemoData(Memos),
      username
    };

    // console.log('post data: ', data);
    return data;
  } catch (error) {
    console.log('error: ', error);
  }
}

// get user info from account/address
async function getUserInfo(account) {
  try {
    // get username
    const username = await getBithompUsername(account);

    // generate Gravatar URL
    const xrpEmailHash = await getXRPEmailHash(account);

    const emailHash = xrpEmailHash ? xrpEmailHash.toLowerCase() : md5(account);

    const gravatarURL = `https://www.gravatar.com/avatar/${emailHash}?s=24&d=retro`;

    // post data object
    const userInfo = {
      account,
      gravatarURL,
      username
    };

    // console.log('getUserInfo: ', userInfo);
    return userInfo;
  } catch (error) {
    console.log('error: ', error);
  }
}

// get post transactions from account transactions
function allPostsFilter(records) {
  const postTx = records.filter(
    record =>
      (record.tx.TransactionType === 'Payment') &
      // Posts have DestinationTag: 99
      (record.tx.DestinationTag === 99 || isWhitelisted(record.tx.hash)) &
      (record.tx.Memos !== undefined) &
      !isBlacklisted(record.tx.hash)
  );

  return postTx;
}

// get post transactions by account from account transactions
function postsByAccountFilter(records, account) {
  const postTx = records.filter(
    record =>
      (record.tx.Account === account) &
      (record.tx.TransactionType === 'Payment') &
      // Post tx have DestinationTag: 99
      (record.tx.DestinationTag === 99 || isWhitelisted(record.tx.hash)) &
      (record.tx.Memos !== undefined) &
      !isBlacklisted(record.tx.hash)
  );

  return postTx;
}

// find post tx by id from account transactions
function postByIdFilter(records, id) {
  const postTx = records.filter(record => record.tx.hash === id);

  return postTx[0];
}

// find comments on post from account transactions
function commentsByPostIdFilter(records, id) {
  const commentTx = records.filter(record => {
    // Comment tx have DestinationTag: 100
    if (
      isBlacklisted(record.tx.hash) ||
      record.tx.DestinationTag !== 100 ||
      !record.tx.Memos
    )
      return false;

    // Parse memo data
    const memoData = parseMemoData(record.tx.Memos);

    // filter out defective comments w/o post ID
    if (memoData.length < 64) return false;

    // Get post ID
    const postId = memoData.substring(0, 64);
    // console.log('postId: ', postId);
    // Compare
    return postId === id;
  });

  return commentTx;
}

// find likes on post from account transactions
function likesByPostIdFilter(records, id) {
  const likeTx = records.filter(record => {
    // Like tx have DestinationTag: 101
    if (record.tx.DestinationTag !== 101 || !record.tx.Memos) return false;

    // Parse memo data
    const memoData = parseMemoData(record.tx.Memos);

    // Get post ID
    const postId = memoData.substring(0, 64);

    // Compare
    return postId === id;
  });

  return likeTx;
}

async function getPosts(records, cursor) {
  const postTx = allPostsFilter(records);

  const lastPostIdx = postTx.length - 1;
  const nextCursorIdx = cursor + 4;
  // console.log('nextCursorIdx: ', nextCursorIdx);
  const result = {
    nextCursor: lastPostIdx >= nextCursorIdx ? nextCursorIdx : null
  };

  // get next 4 posts starting with cursor index
  const postsBatch = postTx.slice(cursor, nextCursorIdx);

  // get posts data
  const postsData = await postsBatch.map(async record => {
    const data = await getPostData(record.tx);
    // console.log('data: ', data);
    return data;
  });

  return Promise.all(postsData).then(posts => {
    result.posts = posts;
    // console.log('posts: ', posts);
    return result;
  });
}

async function getPostsByAccount(records, account, cursor) {
  const postTx = postsByAccountFilter(records, account);

  const lastPostIdx = postTx.length - 1;
  const nextCursorIdx = cursor + 4;
  // console.log('nextCursorIdx: ', nextCursorIdx);
  const result = {
    nextCursor: lastPostIdx >= nextCursorIdx ? nextCursorIdx : null
  };

  // get next 4 posts starting with cursor index
  const postsBatch = postTx.slice(cursor, nextCursorIdx);

  // get posts data
  const postsData = await postsBatch.map(async record => {
    const data = await getPostData(record.tx);
    // console.log('data: ', data);
    return data;
  });

  return Promise.all(postsData).then(posts => {
    result.posts = posts;
    // console.log('posts: ', posts);
    return result;
  });
}

async function getPost(records, id) {
  const postTx = await postByIdFilter(records, id);

  // get post data
  const post = await getPostData(postTx.tx);

  return post;
}

async function getPostComments(records, id) {
  const commentTx = await commentsByPostIdFilter(records, id);
  const commentsData = await commentTx.map(async record => {
    const data = await getPostData(record.tx);

    // remove post ids from memoData
    const commentText = data.memoData.substring(65);
    data.memoData = commentText;
    return data;
  });

  return Promise.all(commentsData).then(comments => {
    // console.log('comments: ', comments);
    return comments;
  });
}

async function getPostLikes(records, id) {
  const likeTx = await likesByPostIdFilter(records, id);
  const likesData = await likeTx.map(async record => {
    const data = await getPostData(record.tx);

    return data;
  });

  return Promise.all(likesData).then(likes => {
    // console.log('likes: ', likes);
    return likes;
  });
}

module.exports = {
  hex2String,
  string2Hex,
  parseMemoData,
  getTimestamp,
  getPostData,
  getUserInfo,
  allPostsFilter,
  postByIdFilter,
  commentsByPostIdFilter,
  likesByPostIdFilter,
  getPosts,
  getPostsByAccount,
  getPost,
  getPostComments,
  getPostLikes
};
