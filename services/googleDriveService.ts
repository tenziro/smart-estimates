declare global {
  interface Window {
    google: any;
    gapi: any;
  }
}

const SCOPE = 'https://www.googleapis.com/auth/drive.file';
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "283879933314-osuolpi0siud30gmllr8jcndqbrmsj1q.apps.googleusercontent.com";

export const isDriveConfigured = (): boolean => {
    return !!CLIENT_ID;
};

export const uploadPDFToDrive = async (pdfBlob: Blob, fileName: string, accessToken: string, folderId?: string) => {
  const metadata: any = {
    name: fileName + '.pdf',
    mimeType: 'application/pdf',
  };

  if (folderId) {
    metadata.parents = [folderId];
  }

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', pdfBlob);

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  });

  if (!res.ok) throw new Error('Upload to Drive failed');
  return res.json();
};

export const getAccessToken = (): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
        return reject(new Error('Google Identity Services script not loaded.'));
    }
    
    // Safety check for missing client ID
    if (!CLIENT_ID) {
        return reject(new Error('Missing required parameter client_id. Please configure GOOGLE_CLIENT_ID.'));
    }

    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID, 
      scope: SCOPE,
      callback: (tokenResponse: any) => {
        if (tokenResponse.access_token) {
          resolve(tokenResponse.access_token);
        } else {
          reject(new Error('Failed to get access token'));
        }
      },
    });
    client.requestAccessToken();
  });
};

export const pickFolder = (accessToken: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!window.gapi) {
        return reject(new Error('GAPI script not loaded'));
    }
    
    window.gapi.load('picker', () => {
        const pickerBuilder = new window.google.picker.PickerBuilder()
            .addView(window.google.picker.ViewId.FOLDERS)
            .setOAuthToken(accessToken)
            .setCallback((data: any) => {
                if (data[window.google.picker.Response.ACTION] === window.google.picker.Action.PICKED) {
                    const doc = data[window.google.picker.Response.DOCUMENTS][0];
                    resolve(doc[window.google.picker.Document.ID]);
                } else if (data[window.google.picker.Response.ACTION] === window.google.picker.Action.CANCEL) {
                    reject(new Error('Folder selection cancelled'));
                }
            });
            
        // Only set developer key if it exists
        if (process.env.GOOGLE_API_KEY) {
            pickerBuilder.setDeveloperKey(process.env.GOOGLE_API_KEY);
        }
            
        const picker = pickerBuilder.build();
        picker.setVisible(true);
    });
  });
};