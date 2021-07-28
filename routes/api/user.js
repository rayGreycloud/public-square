const express = require('express');

const {
  appReturnURL,
  sendPayload,
  getPayload
} = require('../../services/xumm');

const { getUserInfo } = require('../../util/tx-data');

const router = express.Router();

// @route   POST api/user/signin
// @desc    Signin w/xumm auth
// @access  Public
router.post('/signin', async (req, res) => {
  try {
    const payloadConfig = {
      txjson: {
        TransactionType: 'SignIn'
      },
      options: {
        submit: false,
        expire: 1440,
        return_url: {
          web: `${appReturnURL}/signing-in?id={id}`
        }
      }
    };

    // submit transaction using xumm
    const data = await sendPayload(payloadConfig);
    // console.log('signin payload response: ', data);

    res.send({ payload_uuid: data.uuid });
  } catch (error) {
    console.error(error);
    res.send({ error });
  }
});

// @route   GET api/user/data
// @desc    Confirm tx and get data
// @query   id: payload_uiid
// @access  Public
router.get('/data', async (req, res) => {
  const { id } = req.query;

  try {
    // confirm transaction using xumm
    const data = await getPayload(id);
    console.log('data: ', data);

    const userData = {
      application: data.application,
      response: data.response
    };

    console.log('route/userData: ', userData);

    res.send(userData);
  } catch (error) {
    console.error(error);
    res.send({ error });
  }
});

// @route   GET api/user/info
// @desc    Get user info: username; gravatarURL
// @query   account: user account/address
// @access  Public
router.get('/info', async (req, res) => {
  const { account } = req.query;

  try {
    // confirm transaction using xumm
    const userInfo = await getUserInfo(account);

    // check result
    console.log('route/userInfo: ', userInfo);

    res.send(userInfo);
  } catch (error) {
    console.error(error);
    res.send({ error });
  }
});

module.exports = router;
