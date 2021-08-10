const axios = require('axios');
const bithompApiKey = require('../config/keys').bithompApiKey;

const config = {
  headers: {
    'content-type': 'application/json',
    'x-bithomp-token': bithompApiKey
  }
};

const baseURL = `https://bithomp.com/api/v2/address/`;

/**
 * @desc get associated username for XRP account from Bithomp
 * @param {string} account XRP account/address
 * @return {promise} username associated with account or undefined
 */
async function getBithompUsername(address) {
  try {
    const result = await axios.get(
      `${baseURL}${address}?username=true`,
      config
    );

    const { username } = result.data;

    return username;
  } catch (error) {
    console.log('bithomp error: ', error.data);
    return null;
  }
}

module.exports = { getBithompUsername };
