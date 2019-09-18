import {
  DeviceEventEmitter,
  NativeEventEmitter,
  NativeModules,
  Platform,
} from 'react-native';

const { RNIapIos, RNIapModule } = NativeModules;

const ANDROID_ITEM_TYPE_SUBSCRIPTION = 'subs';
const ANDROID_ITEM_TYPE_IAP = 'inapp';

export const PROMOTED_PRODUCT = 'iap-promoted-product';

function checkNativeAndroidAvailable() {
  if (!RNIapModule) {
    return Promise.reject(
      new Error(
        'E_IAP_NOT_AVAILABLE',
        'The payment setup is not available in this version of the app. Contact admin.',
      ),
    );
  }
}

function checkNativeiOSAvailable() {
  if (!RNIapIos) {
    return Promise.reject(
      new Error(
        'E_IAP_NOT_AVAILABLE',
        'The payment setup is not available in this version of the app. Contact admin.',
      ),
    );
  }
}
/**
 * Init module for purchase flow. Required on Android. In ios it will check wheter user canMakePayment.
 * @returns {Promise<string>}
 */
export const initConnection = () =>
  Platform.select({
    ios: () => {
      if (!RNIapIos) {
        return Promise.resolve();
      }
      return RNIapIos.canMakePayments();
    },
    android: () => {
      if (!RNIapModule) {
        return Promise.resolve();
      }
      return RNIapModule.initConnection();
    },
  })();

/**
 * End module for purchase flow. Required on Android. No-op on iOS.
 * @returns {Promise<void>}
 */
export const endConnectionAndroid = () =>
  Platform.select({
    ios: () => Promise.resolve(),
    android: () => {
      if (!RNIapModule) {
        return Promise.resolve();
      }
      return RNIapModule.endConnection();
    },
  })();

/**
 * Consume all remaining tokens. Android only.
 * @returns {Promise<void>}
 */
export const consumeAllItemsAndroid = () =>
  Platform.select({
    ios: () => Promise.resolve(),
    android: () => {
      checkNativeAndroidAvailable();
      return RNIapModule.refreshItems();
    },
  })();

/**
 * Get a list of products (consumable and non-consumable items, but not subscriptions)
 * @param {string[]} skus The item skus
 * @returns {Promise<Product[]>}
 */
export const getProducts = (skus) =>
  Platform.select({
    ios: () => {
      if (!RNIapIos) {
        return [];
      }
      return RNIapIos.getItems(skus).then((items) => items.filter((item) => item.productId));
    },
    android: () => {
      if (!RNIapModule) {
        return [];
      }
      return RNIapModule.getItemsByType(ANDROID_ITEM_TYPE_IAP, skus);
    },
  })();

/**
 * Get a list of subscriptions
 * @param {string[]} skus The item skus
 * @returns {Promise<Subscription[]>}
 */
export const getSubscriptions = (skus) =>
  Platform.select({
    ios: () => {
      checkNativeiOSAvailable();
      return RNIapIos.getItems(skus).then((items) =>
        items.filter((item) => skus.includes(item.productId)),
      );
    },
    android: () => {
      checkNativeAndroidAvailable();
      return RNIapModule.getItemsByType(ANDROID_ITEM_TYPE_SUBSCRIPTION, skus);
    },
  })();

/**
 * Gets an invetory of purchases made by the user regardless of consumption status
 * @returns {Promise<Purchase[]>}
 */
export const getPurchaseHistory = () =>
  Platform.select({
    ios: () => {
      checkNativeiOSAvailable();
      return RNIapIos.getAvailableItems();
    },
    android: () => {
      checkNativeAndroidAvailable();
      return Promise.all([
        RNIapModule.getPurchaseHistoryByType(ANDROID_ITEM_TYPE_IAP),
        RNIapModule.getPurchaseHistoryByType(ANDROID_ITEM_TYPE_SUBSCRIPTION),
      ]).then((res) => {
        const [products, subscriptions] = res;
        return products.concat(subscriptions);
      });
    },
  })();

/**
 * Get all purchases made by the user (either non-consumable, or haven't been consumed yet)
 * @returns {Promise<Purchase[]>}
 */
export const getAvailablePurchases = () =>
  Platform.select({
    ios: () => {
      checkNativeiOSAvailable();
      return RNIapIos.getAvailableItems();
    },
    android: () => {
      checkNativeAndroidAvailable();
      return Promise.all([
        RNIapModule.getAvailableItemsByType(ANDROID_ITEM_TYPE_IAP),
        RNIapModule.getAvailableItemsByType(ANDROID_ITEM_TYPE_SUBSCRIPTION),
      ]).then((res) => {
        const [products, subscriptions] = res;
        return products.concat(subscriptions);
      });
    },
  })();

/**
 * Request a purchase for product. This will be received in `PurchaseUpdatedListener`.
 * @param {string} sku The product's sku/ID
 * @param {boolean} [andDangerouslyFinishTransactionAutomaticallyIOS] You should set this to false and call finishTransaction manually when you have delivered the purchased goods to the user. It defaults to true to provide backwards compatibility. Will default to false in version 4.0.0.
 * @param {string} [developerIdAndroid] Specify an optional obfuscated string of developer profile name.
 * @param {string} [userIdAndroid] Specify an optional obfuscated string that is uniquely associated with the user's account in.
 * @returns {void}
 */
export const requestPurchase = (
  sku,
  andDangerouslyFinishTransactionAutomaticallyIOS,
  developerIdAndroid,
  accountIdAndroid,
) =>
  Platform.select({
    ios: () => {
      andDangerouslyFinishTransactionAutomaticallyIOS =
        andDangerouslyFinishTransactionAutomaticallyIOS === undefined
          ? false
          : andDangerouslyFinishTransactionAutomaticallyIOS;
      if (andDangerouslyFinishTransactionAutomaticallyIOS) {
        console.warn(
          'You are dangerously allowing react-native-iap to finish your transaction automatically. You should set andDangerouslyFinishTransactionAutomatically to false when calling requestPurchase and call finishTransaction manually when you have delivered the purchased goods to the user. It defaults to true to provide backwards compatibility. Will default to false in version 4.0.0.',
        );
      }
      checkNativeiOSAvailable();
      RNIapIos.buyProduct(sku, andDangerouslyFinishTransactionAutomaticallyIOS);
    },
    android: () => {
      checkNativeAndroidAvailable();
      RNIapModule.buyItemByType(
        ANDROID_ITEM_TYPE_IAP,
        sku,
        null,
        0,
        developerIdAndroid,
        accountIdAndroid,
      );
    },
  })();

/**
 * Request a purchase for product. This will be received in `PurchaseUpdatedListener`.
 * @param {string} sku The product's sku/ID
 * @param {boolean} [andDangerouslyFinishTransactionAutomaticallyIOS] You should set this to false and call finishTransaction manually when you have delivered the purchased goods to the user. It defaults to true to provide backwards compatibility. Will default to false in version 4.0.0.
 * @param {string} [oldSkuAndroid] SKU that the user is upgrading or downgrading from.
 * @param {number} [prorationModeAndroid] UNKNOWN_SUBSCRIPTION_UPGRADE_DOWNGRADE_POLICY, IMMEDIATE_WITH_TIME_PRORATION, IMMEDIATE_AND_CHARGE_PRORATED_PRICE, IMMEDIATE_WITHOUT_PRORATION, DEFERRED
 * @param {string} [developerIdAndroid] Specify an optional obfuscated string of developer profile name.
 * @param {string} [userIdAndroid] Specify an optional obfuscated string that is uniquely associated with the user's account in.
 * @returns {void}
 */
export const requestSubscription = (
  sku,
  andDangerouslyFinishTransactionAutomaticallyIOS,
  oldSkuAndroid,
  prorationModeAndroid,
  developerIdAndroid,
  userIdAndroid,
) =>
  Platform.select({
    ios: () => {
      andDangerouslyFinishTransactionAutomaticallyIOS =
        andDangerouslyFinishTransactionAutomaticallyIOS === undefined
          ? false
          : andDangerouslyFinishTransactionAutomaticallyIOS;
      if (andDangerouslyFinishTransactionAutomaticallyIOS) {
        console.warn(
          'You are dangerously allowing react-native-iap to finish your transaction automatically. You should set andDangerouslyFinishTransactionAutomatically to false when calling requestPurchase and call finishTransaction manually when you have delivered the purchased goods to the user. It defaults to true to provide backwards compatibility. Will default to false in version 4.0.0.',
        );
      }
      checkNativeiOSAvailable();
      RNIapIos.buyProduct(sku, andDangerouslyFinishTransactionAutomaticallyIOS);
    },
    android: () => {
      checkNativeAndroidAvailable();
      if (!prorationModeAndroid) prorationModeAndroid = -1;
      RNIapModule.buyItemByType(
        ANDROID_ITEM_TYPE_SUBSCRIPTION,
        sku,
        oldSkuAndroid,
        prorationModeAndroid,
        developerIdAndroid,
        userIdAndroid,
      );
    },
  })();

/**
 * Request a purchase for product. This will be received in `PurchaseUpdatedListener`.
 * @param {string} sku The product's sku/ID
 * @returns {Promise<string>}
 */
export const requestPurchaseWithQuantityIOS = (sku, quantity) =>
  Platform.select({
    ios: () => {
      checkNativeiOSAvailable();
      RNIapIos.buyProductWithQuantityIOS(sku, quantity);
    },
  })();

/**
 * Finish Transaction (iOS only)
 *   Similar to `consumePurchaseAndroid`. Tells StoreKit that you have delivered the purchase to the user and StoreKit can now let go of the transaction.
 *   Call this after you have persisted the purchased state to your server or local data in your app.
 *   `react-native-iap` will continue to deliver the purchase updated events with the successful purchase until you finish the transaction. **Even after the app has relaunched.**
 * @param {string} transactionId The transactionId of the function that you would like to finish.
 * @returns {null}
 */
export const finishTransactionIOS = (transactionId) => {
  Platform.select({
    ios: () => {
      checkNativeiOSAvailable();
      return RNIapIos.finishTransaction(transactionId);
    },
  })();
};

/**
 * Finish Transaction (both platforms)
 *   Abstracts `finishTransactionIOS`, `consumePurchaseAndroid`, `acknowledgePurchaseAndroid` in to one method.
 * @param {string} transactionId The transactionId of the function that you would like to finish.
 * @param {boolean} isConsumable Checks if purchase is consumable. Has effect on `android`.
 * @param {string} developerPayloadAndroid Android developerPayload.
 * @returns {Promise}
 */
export const finishTransaction = (
  transactionId,
  isConsumable,
  developerPayloadAndroid,
) => {
  Platform.select({
    ios: () => {
      checkNativeiOSAvailable();
      return RNIapIos.finishTransaction(transactionId);
    },
    android: () => {
      if (isConsumable) {
        return RNIapModule.consumePurchaseAndroid(transactionId, developerPayloadAndroid);
      }
      return RNIapModule.acknowledgePurchaseAndroid(transactionId, developerPayloadAndroid);
    },
  })();
};

/**
 * Clear Transaction (iOS only)
 *   Finish remaining transactions. Related to issue #257
 *     link : https://github.com/dooboolab/react-native-iap/issues/257
 * @returns {null}
 */
export const clearTransactionIOS = () => {
  console.warn('The `clearTransactionIOS` method is deprecated.');
  Platform.select({
    ios: () => {
      checkNativeiOSAvailable();
      RNIapIos.clearTransaction();
    },
  })();
};

/**
 * Clear valid Products (iOS only)
 *   Remove all products which are validated by Apple server.
 * @returns {null}
 */
export const clearProductsIOS = () =>
  Platform.select({
    ios: () => {
      checkNativeiOSAvailable();
      RNIapIos.clearProducts();
    },
  })();

/**
 * Acknowledge a product (on Android.) No-op on iOS.
 * @param {string} token The product's token (on Android)
 * @returns {Promise}
 */
export const acknowledgePurchaseAndroid = (token, developerPayload) =>
  Platform.select({
    android: () => {
      checkNativeAndroidAvailable();
      return RNIapModule.acknowledgePurchase(token, developerPayload);
    },
  })();

/**
 * Consume a product (on Android.) No-op on iOS.
 * @param {string} token The product's token (on Android)
 * @returns {Promise}
 */
export const consumePurchaseAndroid = (token, developerPayload) =>
  Platform.select({
    android: () => {
      checkNativeAndroidAvailable();
      return RNIapModule.consumeProduct(token, developerPayload);
    },
  })();

/**
 * Should Add Store Payment (iOS only)
 *   Indicates the the App Store purchase should continue from the app instead of the App Store.
 * @returns {null}
 */
export const getPromotedProductIOS = () =>
  Platform.select({
    ios: () => {
      checkNativeiOSAvailable();
      return RNIapIos.promotedProduct();
    },
  })();

/**
 * Buy the currently selected promoted product (iOS only)
 *   Initiates the payment process for a promoted product. Should only be called in response to the `iap-promoted-product` event.
 * @returns {null}
 */
export const buyPromotedProductIOS = () =>
  Platform.select({
    ios: () => {
      checkNativeiOSAvailable();
      return RNIapIos.buyPromotedProduct();
    },
  })();

/**
 * Buy products or subscriptions with offers (iOS only)
 *
 * Runs the payment process with some infor you must fetch
 * from your server.
 * @param {string} sku The product identifier
 * @param {string} forUser  An user identifier on you system
 * @param {object} withOffer The offer information
 * @param {string} withOffer.identifier The offer identifier
 * @param {string} withOffer.keyIdentifier Key identifier that it uses to generate the signature
 * @param {string} withOffer.nonce An UUID returned from the server
 * @param {string} withOffer.signature The actual signature returned from the server
 * @param {number} withOffer.timestamp The timestamp of the signature
 * @returns {Promise}
 */
export const requestPurchaseWithOfferIOS = (sku, forUser, withOffer) =>
  Platform.select({
    ios: () => {
      checkNativeiOSAvailable();
      return RNIapIos.buyProductWithOffer(sku, forUser, withOffer);
    },
  })();

/**
 * Validate receipt for iOS.
 * @param {object} receiptBody the receipt body to send to apple server.
 * @param {string} isTest whether this is in test environment which is sandbox.
 * @returns {Promise<object>}
 */
export const validateReceiptIos = (receiptBody, isTest) => {
  const url = isTest ? 'https://sandbox.itunes.apple.com/verifyReceipt' : 'https://buy.itunes.apple.com/verifyReceipt';

  return fetch(url, {
    method: 'POST',
    headers: new Headers({
      Accept: 'application/json',
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify(receiptBody),
  }).then((response) => {
    if (!response.ok) {
      throw Object.assign(new Error(response.statusText), { statusCode: response.status });
    }

    return response.json();
  });
};

/**
 * Validate receipt for Android.
 * @param {string} packageName package name of your app.
 * @param {string} productId product id for your in app product.
 * @param {string} productToken token for your purchase.
 * @param {string} accessToken accessToken from googleApis.
 * @param {boolean} isSub whether this is subscription or inapp. `true` for subscription.
 * @returns {Promise<object>}
 */
export const validateReceiptAndroid = (packageName, productId, productToken, accessToken, isSub) => {
  const type = isSub ? 'subscriptions' : 'products';
  const url = `https://www.googleapis.com/androidpublisher/v2/applications/${packageName}/purchases/${type}/${productId}/tokens/${productToken}?access_token=${accessToken}`;

  return fetch(url, {
    method: 'GET',
    headers: new Headers({ Accept: 'application/json' }),
  }).then((response) => {
    if (!response.ok) {
      throw Object.assign(new Error(response.statusText), {
        statusCode: response.status,
      });
    }

    return response.json();
  });
};

/**
 * Add IAP purchase event in ios.
 * @returns {callback(e: ProductPurchase)}
 */
export const purchaseUpdatedListener = (e) => {
  if (Platform.OS === 'ios') {
    checkNativeiOSAvailable();
    const myModuleEvt = new NativeEventEmitter(RNIapIos);
    return myModuleEvt.addListener('purchase-updated', e);
  } else {
    const emitterSubscription = DeviceEventEmitter.addListener('purchase-updated', e);
    RNIapModule.startListening();
    return emitterSubscription;
  }
};

/**
 * Add IAP purchase error event in ios.
 * @returns {callback(e: ProductPurchase)}
 */
export const purchaseErrorListener = (e) => {
  if (Platform.OS === 'ios') {
    checkNativeiOSAvailable();
    const myModuleEvt = new NativeEventEmitter(RNIapIos);
    return myModuleEvt.addListener('purchase-error', e);
  } else {
    return DeviceEventEmitter.addListener('purchase-error', e);
  }
};

/**
 * Get the current receipt base64 encoded in IOS.
 * @returns {Promise<string>}
 */
export const getReceiptIOS = () => {
  if (Platform.OS === 'ios') {
    checkNativeiOSAvailable();
    return RNIapIos.requestReceipt();
  }
};

/**
 * Get the pending purchases in IOS.
 * @returns {Promise<ProductPurchase[]>}
 */
export const getPendingPurchasesIOS = () => {
  if (Platform.OS === 'ios') {
    checkNativeiOSAvailable();
    return RNIapIos.getPendingTransactions();
  }
};

/**
 * deprecated codes
 */
/*
export const validateReceiptIos = async (receiptBody, isTest) => {
  if (Platform.OS === 'ios') {
    const URL = isTest ? 'https://sandbox.itunes.apple.com/verifyReceipt' : 'https://buy.itunes.apple.com/verifyReceipt';
    try {
      let res = await fetch(URL, {
        method: 'POST',
        headers: new Headers({
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify(receiptBody),
      });

      if (res) {
        const json = await res.text();
        res = JSON.parse(json);
        return res;
      }

      return false;
    } catch (err) {
      console.log(err);
      return false;
    }
  }

  return response.json();
};
*/

export default {
  initConnection,
  endConnectionAndroid,
  getProducts,
  getSubscriptions,
  getPurchaseHistory,
  getAvailablePurchases,
  getPendingPurchasesIOS,
  consumeAllItemsAndroid,
  clearProductsIOS,
  clearTransactionIOS,
  acknowledgePurchaseAndroid,
  consumePurchaseAndroid,
  validateReceiptIos,
  validateReceiptAndroid,
  requestPurchase,
  requestPurchaseWithQuantityIOS,
  finishTransactionIOS,
  finishTransaction,
  requestSubscription,
  purchaseUpdatedListener,
  purchaseErrorListener,
  getReceiptIOS,
};
