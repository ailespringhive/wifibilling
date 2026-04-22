const APPWRITE_ENDPOINT = 'https://appwrite.springhive.co/v1';
const APPWRITE_PROJECT_ID = '69c4840a0022d6824d83';
const APPWRITE_DATABASE_ID = 'wifi_billing_db';
const APPWRITE_API_KEY = 'standard_b650468f4a776eac08a7d0f31aea79b5de528e970e85714564a8d0480a9cffc6d0c947aaeaecc2a2011b98c97f90515cbf5f9e16d3cd6230d259d1e91d885a1de14d5c1cb20da10930d49bcc3f3cb7d3f4a5011619cba4e42d533abefbc60435de9ab782c82e59704a44ea08b88f9babd5a6edb83fb50e2bc6f4cb33e1069b6c';

async function createAdmin() {
  const email = "junriladmin@admin.com";
  // Setting a strong default password.
  const password = "Password123!";
  const name = "Junril Admin";
  let userId;

  console.log(`Attempting to create admin account: ${email}...`);
  const res = await fetch(`${APPWRITE_ENDPOINT}/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Appwrite-Project': APPWRITE_PROJECT_ID,
      'X-Appwrite-Key': APPWRITE_API_KEY,
    },
    body: JSON.stringify({
      userId: 'unique()',
      email: email,
      password: password,
      name: name
    })
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Failed to create user (maybe already exists?):", text);
    
    // Attempt to list users and find the existing one if it failed
    const listRes = await fetch(`${APPWRITE_ENDPOINT}/users?search=${email}`, {
       headers: {
         'X-Appwrite-Project': APPWRITE_PROJECT_ID,
         'X-Appwrite-Key': APPWRITE_API_KEY,
       }
    });
    if (listRes.ok) {
       const listData = await listRes.json();
       if (listData.users && listData.users.length > 0) {
           userId = listData.users[0].$id;
           console.log("Found existing user! Updating their profile instead. ID:", userId);
           
           // If they exist, let's force update password so we know what it is
           await fetch(`${APPWRITE_ENDPOINT}/users/${userId}/password`, {
               method: 'PATCH',
               headers: {
                 'Content-Type': 'application/json',
                 'X-Appwrite-Project': APPWRITE_PROJECT_ID,
                 'X-Appwrite-Key': APPWRITE_API_KEY,
               },
               body: JSON.stringify({ password: password })
           });
           console.log("Reset existing user password safely.");
       } else {
           process.exit(1);
       }
    } else {
       process.exit(1);
    }
  } else {
    const user = await res.json();
    userId = user.$id;
    console.log("User successfully created! ID:", userId);
  }

  console.log("Verifying/Creating Admin Profile in database...");
  const profRes = await fetch(`${APPWRITE_ENDPOINT}/databases/${APPWRITE_DATABASE_ID}/collections/users_profile/documents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Appwrite-Project': APPWRITE_PROJECT_ID,
      'X-Appwrite-Key': APPWRITE_API_KEY,
    },
    body: JSON.stringify({
      documentId: userId,
      data: {
        userId: userId,
        email: email,
        firstName: "Junril",
        lastName: "Admin",
        role: "admin",
        profileImage: ""
      },
      permissions: [
        `read("any")`,
        `update("user:${userId}")`
      ]
    })
  });

  if (!profRes.ok) {
     const profErr = await profRes.text();
     if (profErr.includes("document_already_exists")) {
         console.log("Admin Profile already exists. Upgrading to Global Admin forcefully.");
         // Patch the existing profile
         const patchRes = await fetch(`${APPWRITE_ENDPOINT}/databases/${APPWRITE_DATABASE_ID}/collections/users_profile/documents/${userId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'X-Appwrite-Project': APPWRITE_PROJECT_ID,
              'X-Appwrite-Key': APPWRITE_API_KEY,
            },
            body: JSON.stringify({
              data: {
                 role: "admin"
              }
            })
         });
         if (patchRes.ok) {
             console.log("Successfully upgraded to admin.");
         }
     } else {
         console.error("Failed to create profile:", profErr);
     }
  } else {
     console.log("Admin Profile created successfully!");
  }
  
  console.log("\n==================================");
  console.log("ACCOUNT DETAILS:");
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
  console.log("Role: admin");
  console.log("==================================");
}

createAdmin();
