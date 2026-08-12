const fs = require('fs');

async function run() {
  try {
    const preference = {
      items: [
        {
          id: 'test',
          title: 'test',
          quantity: 1,
          currency_id: 'BRL',
          unit_price: 10
        }
      ],
      back_urls: {
        success: "http://127.0.0.1:3000/index.html?payment=success",
        failure: "http://127.0.0.1:3000/index.html?payment=failure",
        pending: "http://127.0.0.1:3000/index.html?payment=pending"
      },
      auto_return: 'approved'
    };

    const token = 'APP_USR-830670487552796-072520-b9accc474b03d68254912f4c40351cfd-3490727779';
    
    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(preference)
    });
    const data = await response.json();
    console.log(data);
  } catch(e) {
    console.error(e);
  }
}
run();
