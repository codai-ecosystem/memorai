// Mock Redis connection for service
export const redis = {
  async get(key) {
    console.log(`Mock Redis GET: ${key}`);
    return null;
  },
  
  async set(key, value, options) {
    console.log(`Mock Redis SET: ${key} = ${value}`, options);
    return 'OK';
  },
  
  async del(key) {
    console.log(`Mock Redis DEL: ${key}`);
    return 1;
  },
  
  async hget(key, field) {
    console.log(`Mock Redis HGET: ${key}.${field}`);
    return null;
  },
  
  async hset(key, field, value) {
    console.log(`Mock Redis HSET: ${key}.${field} = ${value}`);
    return 1;
  },
  
  async ping() {
    console.log('Mock Redis PING');
    return 'PONG';
  },
  
  async flushall() {
    console.log('Mock Redis FLUSHALL');
    return 'OK';
  },
  
  async quit() {
    console.log('Mock Redis: Connection closed');
  }
};

export default redis;
