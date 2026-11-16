const fs = require('fs');
const path = require('path');
const { getConnectionInfo } = require('../config/db');

// Import Mongoose models for when connected to real MongoDB
const UserModel = require('../models/User');
const ProductModel = require('../models/Product');
const BidModel = require('../models/Bid');
const RequestModel = require('../models/Request');
const ConversationModel = require('../models/Conversation');
const ReviewModel = require('../models/Review');
const ReportModel = require('../models/Report');
const NotificationModel = require('../models/Notification');
const ActivityModel = require('../models/Activity');

const DATA_FILE = path.join(__dirname, '../data/db.json');

// In-memory cache for fallback mode
let memoryStore = {
  users: [],
  products: [],
  bids: [],
  requests: [],
  conversations: [],
  reviews: [],
  reports: [],
  notifications: [],
  activities: []
};

// Load existing data from file if present
function loadStoreFromFile() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        memoryStore = {
          users: Array.isArray(parsed.users) ? parsed.users : [],
          products: Array.isArray(parsed.products) ? parsed.products : [],
          bids: Array.isArray(parsed.bids) ? parsed.bids : [],
          requests: Array.isArray(parsed.requests) ? parsed.requests : [],
          conversations: Array.isArray(parsed.conversations) ? parsed.conversations : [],
          reviews: Array.isArray(parsed.reviews) ? parsed.reviews : [],
          reports: Array.isArray(parsed.reports) ? parsed.reports : [],
          notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
          activities: Array.isArray(parsed.activities) ? parsed.activities : []
        };
      }
    }
  } catch (err) {
    console.error('[DB Adapter] Error reading db.json:', err.message);
  }
}

// Atomic save to file
function saveStoreToFile() {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(memoryStore, null, 2), 'utf-8');
  } catch (err) {
    console.error('[DB Adapter] Error writing db.json:', err.message);
  }
}

loadStoreFromFile();

// Matcher helper for queries
function matchesQuery(item, query) {
  if (!query || Object.keys(query).length === 0) return true;

  for (const key of Object.keys(query)) {
    const cond = query[key];

    // Special OR query
    if (key === '$or' && Array.isArray(cond)) {
      const anyMatch = cond.some(subQ => matchesQuery(item, subQ));
      if (!anyMatch) return false;
      continue;
    }

    if (key === '_id' || key === 'id') {
      const itemId = item._id || item.id;
      if (typeof cond === 'object' && cond !== null) {
        if (cond.$in && !cond.$in.map(String).includes(String(itemId))) return false;
        if (cond.$ne && String(itemId) === String(cond.$ne)) return false;
      } else if (String(itemId) !== String(cond)) {
        return false;
      }
      continue;
    }

    const val = item[key];

    if (typeof cond === 'object' && cond !== null && !(cond instanceof Date) && !(cond instanceof RegExp)) {
      if (cond.$ne !== undefined && val === cond.$ne) return false;
      if (cond.$in !== undefined && (!Array.isArray(cond.$in) || !cond.$in.includes(val))) return false;
      if (cond.$nin !== undefined && (Array.isArray(cond.$nin) && cond.$nin.includes(val))) return false;
      if (cond.$gt !== undefined && !(val > cond.$gt)) return false;
      if (cond.$gte !== undefined && !(val >= cond.$gte)) return false;
      if (cond.$lt !== undefined && !(val < cond.$lt)) return false;
      if (cond.$lte !== undefined && !(val <= cond.$lte)) return false;
      if (cond.$regex !== undefined) {
        const flags = cond.$options || '';
        const regex = new RegExp(cond.$regex, flags);
        if (!regex.test(String(val || ''))) return false;
      }
    } else if (cond instanceof RegExp) {
      if (!cond.test(String(val || ''))) return false;
    } else {
      if (val !== cond) return false;
    }
  }

  return true;
}

// Sorter helper
function applySort(items, sortObj) {
  if (!sortObj) return items;
  const keys = Object.keys(sortObj);
  if (!keys.length) return items;

  return items.sort((a, b) => {
    for (const key of keys) {
      const order = sortObj[key] === -1 || sortObj[key] === 'desc' ? -1 : 1;
      const va = a[key];
      const vb = b[key];
      if (va < vb) return -1 * order;
      if (va > vb) return 1 * order;
    }
    return 0;
  });
}

// Generate unique ID helper
function uid(prefix = '') {
  return (prefix ? prefix + '_' : '') + Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

// Factory for a collection interface
function createCollection(collectionName, MongooseModel) {
  return {
    async find(query = {}, sort = null) {
      const { isConnected } = getConnectionInfo();
      if (isConnected && MongooseModel) {
        let q = MongooseModel.find(query);
        if (sort) q = q.sort(sort);
        const docs = await q.lean().exec();
        return docs.map(d => ({ ...d, id: d._id ? String(d._id) : d.id }));
      }

      let items = memoryStore[collectionName].filter(item => matchesQuery(item, query));
      if (sort) items = applySort([...items], sort);
      return items.map(i => ({ ...i, id: i.id || i._id }));
    },

    async findOne(query = {}) {
      const { isConnected } = getConnectionInfo();
      if (isConnected && MongooseModel) {
        const doc = await MongooseModel.findOne(query).lean().exec();
        if (!doc) return null;
        return { ...doc, id: doc._id ? String(doc._id) : doc.id };
      }

      const item = memoryStore[collectionName].find(i => matchesQuery(i, query));
      if (!item) return null;
      return { ...item, id: item.id || item._id };
    },

    async findById(id) {
      return this.findOne({ _id: id });
    },

    async create(data) {
      const { isConnected } = getConnectionInfo();
      if (isConnected && MongooseModel) {
        const created = await MongooseModel.create(data);
        const doc = created.toObject ? created.toObject() : created;
        return { ...doc, id: String(doc._id) };
      }

      const id = data.id || data._id || uid(collectionName.charAt(0));
      const newDoc = {
        ...data,
        id,
        _id: id,
        createdAt: data.createdAt || new Date().toISOString()
      };
      memoryStore[collectionName].unshift(newDoc);
      saveStoreToFile();
      return { ...newDoc };
    },

    async findByIdAndUpdate(id, update, options = { new: true }) {
      const { isConnected } = getConnectionInfo();
      if (isConnected && MongooseModel) {
        const updated = await MongooseModel.findByIdAndUpdate(id, update, { new: true, runValidators: true }).lean().exec();
        if (!updated) return null;
        return { ...updated, id: String(updated._id) };
      }

      const idx = memoryStore[collectionName].findIndex(i => String(i.id || i._id) === String(id));
      if (idx === -1) return null;

      const current = memoryStore[collectionName][idx];
      let updatedData = { ...current };

      if (update.$set) {
        updatedData = { ...updatedData, ...update.$set };
      }
      if (update.$inc) {
        for (const k of Object.keys(update.$inc)) {
          updatedData[k] = (Number(updatedData[k]) || 0) + update.$inc[k];
        }
      }
      if (update.$push) {
        for (const k of Object.keys(update.$push)) {
          if (!Array.isArray(updatedData[k])) updatedData[k] = [];
          updatedData[k].push(update.$push[k]);
        }
      }
      // Direct property assignments
      for (const k of Object.keys(update)) {
        if (!k.startsWith('$')) {
          updatedData[k] = update[k];
        }
      }

      memoryStore[collectionName][idx] = updatedData;
      saveStoreToFile();
      return { ...updatedData };
    },

    async updateOne(query, update) {
      const item = await this.findOne(query);
      if (!item) return { matchedCount: 0, modifiedCount: 0 };
      const updated = await this.findByIdAndUpdate(item.id || item._id, update);
      return { matchedCount: 1, modifiedCount: updated ? 1 : 0 };
    },

    async updateMany(query, update) {
      const items = await this.find(query);
      let count = 0;
      for (const it of items) {
        const u = await this.findByIdAndUpdate(it.id || it._id, update);
        if (u) count++;
      }
      return { matchedCount: items.length, modifiedCount: count };
    },

    async deleteOne(query) {
      const { isConnected } = getConnectionInfo();
      if (isConnected && MongooseModel) {
        const res = await MongooseModel.deleteOne(query).exec();
        return { deletedCount: res.deletedCount };
      }

      const idx = memoryStore[collectionName].findIndex(i => matchesQuery(i, query));
      if (idx === -1) return { deletedCount: 0 };
      memoryStore[collectionName].splice(idx, 1);
      saveStoreToFile();
      return { deletedCount: 1 };
    },

    async deleteMany(query = {}) {
      const { isConnected } = getConnectionInfo();
      if (isConnected && MongooseModel) {
        const res = await MongooseModel.deleteMany(query).exec();
        return { deletedCount: res.deletedCount };
      }

      const before = memoryStore[collectionName].length;
      memoryStore[collectionName] = memoryStore[collectionName].filter(i => !matchesQuery(i, query));
      const deletedCount = before - memoryStore[collectionName].length;
      saveStoreToFile();
      return { deletedCount };
    },

    async countDocuments(query = {}) {
      const { isConnected } = getConnectionInfo();
      if (isConnected && MongooseModel) {
        return await MongooseModel.countDocuments(query).exec();
      }
      return memoryStore[collectionName].filter(i => matchesQuery(i, query)).length;
    }
  };
}

const db = {
  users: createCollection('users', UserModel),
  products: createCollection('products', ProductModel),
  bids: createCollection('bids', BidModel),
  requests: createCollection('requests', RequestModel),
  conversations: createCollection('conversations', ConversationModel),
  reviews: createCollection('reviews', ReviewModel),
  reports: createCollection('reports', ReportModel),
  notifications: createCollection('notifications', NotificationModel),
  activities: createCollection('activities', ActivityModel),

  // Direct access to state for testing & seeders
  _getRawMemoryStore() {
    return memoryStore;
  },
  _setRawMemoryStore(newStore) {
    memoryStore = { ...newStore };
    saveStoreToFile();
  },
  _save() {
    saveStoreToFile();
  }
};

module.exports = db;
