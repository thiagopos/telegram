import axios from 'axios';

export async function downloadFileBuffer(fileUrl) {
  const response = await axios({
    url: fileUrl,
    method: 'GET',
    responseType: 'arraybuffer',
    // You can add timeout or retry logic here if desired
  });

  return Buffer.from(response.data, 'binary');
}
