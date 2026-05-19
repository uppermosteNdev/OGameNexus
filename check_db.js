const { Dexie } = require('dexie');
const { indexedDB, IDBKeyRange } = require('fake-indexeddb');
const db = new Dexie('OGNexusDB', { indexedDB });

async function check() {
    try {
        await db.open();
        const records = await db.table('combatReports').limit(5).toArray();
        console.log(JSON.stringify(records, null, 2));
    } catch (e) {
        console.log("DB ERROR", e);
    }
}
check();
