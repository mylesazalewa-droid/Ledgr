const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { initializeApp }    = require('firebase-admin/app');
const { getMessaging }     = require('firebase-admin/messaging');
const { getFirestore }     = require('firebase-admin/firestore');

initializeApp();

/**
 * Fires whenever a buyer drops a new message into any seller's inbox.
 * Looks up all FCM tokens for that seller and sends a push notification.
 */
exports.onNewMessage = onDocumentCreated(
  'messages/{sellerId}/inbox/{messageId}',
  async (event) => {
    const data     = event.data?.data();
    const sellerId = event.params.sellerId;

    if (!data) return;

    const db         = getFirestore();
    const tokensSnap = await db.collection(`users/${sellerId}/fcmTokens`).get();

    if (tokensSnap.empty) return; // seller hasn't enabled push yet

    const title = `${data.buyerName || 'Someone'} is interested in ${data.itemName || 'an item'}`;
    const body  = data.message || '';

    const messaging = getMessaging();

    // Send to every registered token; silently ignore stale / revoked ones
    await Promise.all(
      tokensSnap.docs.map(tokenDoc =>
        messaging
          .send({
            token: tokenDoc.id,
            notification: { title, body },
            webpush: {
              notification: {
                icon:    '/icon-192.png',
                badge:   '/icon-192.png',
                vibrate: [100, 50, 100],
              },
              fcmOptions: { link: '/' },
            },
          })
          .catch(() => null) // don't fail the function for a single bad token
      )
    );
  }
);
