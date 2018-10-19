const dotenv = require('dotenv').config();
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const util = require('util');
const updateSheet = require('./GoogleSheets');


const shopifyApiPublicKey = process.env.SHOPIFY_API_PUBLIC_KEY;
const shopifyApiSecretKey = process.env.SHOPIFY_API_SECRET_KEY;

const app = express();
const PORT = 3001

app.get('/', async (req, res) => {
  
  let shop = req.query.shop;

  if (!shop) { 
      
     shop = process.env.SHOP_URl
  }  

  const countShop =  await fetchShopifyCount(shop);

  res.send(`Hola esta es la app de shopify que actualiza los precios y stocks directos de SAP, Actualmente cuentas con ${countShop.data.count} productos dados de alta y listos para la venta SALUDOS CORDIALES TI` );

});


const buildShopCountRequestUrl = (shop) => `https://${shopifyApiPublicKey}:${shopifyApiSecretKey}@${shop}/admin/products/count.json`;

const buildSapRequestUrl = (router) => `http://localhost:4567/Shopify/${router}`;

const buildProductsDataRequestUrl = (shop) => `https://${shopifyApiPublicKey}:${shopifyApiSecretKey}@${shop}/admin/products.json?fields=id,variants`;


const fetchSapData = async (router) => await axios(buildSapRequestUrl(router), {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
  
});

const fetchShopifyCount = async (shop) => await axios(buildShopCountRequestUrl(shop), {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
  
});
const fetchProductData = async (shop) => await axios(buildProductsDataRequestUrl(shop), {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
});

const innerJoin = (xs, ys, sel) =>
    xs.reduce((zs, x) =>
    ys.reduce((zs, y) =>       
    zs.concat(sel(x, y) || []), 
    zs), []);

const fetchProductDataSAP = async  (shopData) => {

productosList =  shopData;
productosStock = await fetchSapData('Resumen');


 const result = innerJoin(productosList, productosStock.data.resumen,
   ({id: uid, sku}, {ItemCode, ItemName, OnHand, Price1, Price2}) => ItemCode === sku && {ItemCode, uid, ItemName, OnHand, Price1, Price2});
   
     return result
}


const iterarArray =  (shopifyProduct) => {

  const obj =  shopifyProduct.products.map(item=>({
        id: item.id,
        sku: item.variants[0].sku,
        price: item.variants[0].price,
        stock: item.variants[0].old_inventory_quantity
      }));

       return obj;
}

const formatDate = (date) => {
    
  const  monthNames = [
    "01", "02", "03",
    "04", "05", "06", "07",
    "08", "09", "10",
    "11", "12"
  ];

  let day = date.getDate();
  let monthIndex = date.getMonth();
  let year = date.getFullYear();

  return `${day}${monthNames[monthIndex]}${year}`;
}

const createLog = async (shopData) => {

  const fecha = new Date();
 
  let shop = process.env.SHOP_URl

  const countShop =  await fetchShopifyCount(shop); 

  logData = {
          totalProducts: countShop.data.count,
          listaProductsShopify: shopData
  }

  fs.appendFile(`./logs/log${formatDate(fecha)}.log`, util.inspect(logData), (err) => {
    if(err) { return console.log(err); }
    return true;
  }); 
}


app.get('/shopify/products', async (req ,res) => {


  let shop = req.query.shop;

  if (!shop) { 
      
     shop = process.env.SHOP_URl
  }  

  const shopRest =  await fetchProductData(shop);
  const shopData =  await iterarArray(shopRest.data);
  const logCheck =  createLog(shopData);
  
  if (logCheck) {

    const dataSap =  await fetchProductDataSAP(shopData); 
    const responseSheet = await updateSheet.Principal(dataSap);
  
        res.send("Procesos Exitoso");
 
      } else {
    
    console.log(`error en la creacion del respaldo de shopify`);
 }
  
  }); 
 

app.listen(PORT, () => console.log(`listening on port ${PORT}`));
