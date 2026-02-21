const axios = require("axios");

async function test() {
  const res = await axios.get(
    `https://generativelanguage.googleapis.com/v1/models?key=AIzaSyAlQnjHuAnQz6boP_uU32OwzY_b1DH7qak`
  );

  console.log(res.data);
}

test();