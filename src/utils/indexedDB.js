export const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('stb_archive_db', 1);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('images')) {
        db.createObjectStore('images', { keyPath: 'noPermintaan' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveImageToLocal = async (noPermintaan, imageData, size) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['images'], 'readwrite');
    const store = transaction.objectStore('images');
    const request = store.put({ 
      noPermintaan, 
      image: imageData, // Boleh base64 string atau Blob
      size, 
      timestamp: Date.now() 
    });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getImageFromLocal = async (noPermintaan) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['images'], 'readonly');
    const store = transaction.objectStore('images');
    const request = store.get(noPermintaan);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const deleteImageFromLocal = async (noPermintaan) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['images'], 'readwrite');
    const store = transaction.objectStore('images');
    const request = store.delete(noPermintaan);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};
