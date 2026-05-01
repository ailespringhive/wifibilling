import { apiBypass, COLLECTIONS } from './src/config/appwrite.js';
import { MobileNotificationService } from './src/services/notification.service.js';

async function run() {
    console.log("Testing notification broadcast...");
    try {
        const collectorsRes = await apiBypass.listDocuments(COLLECTIONS.USERS_PROFILE, [
             'equal("role", ["collector"])',
             'limit(10)'
        ]);
        
        console.log("Found collectors:", collectorsRes.documents?.length);
        if (!collectorsRes.documents || collectorsRes.documents.length === 0) {
            console.log("Raw response:", collectorsRes);
            return;
        }
        
        for (const collector of collectorsRes.documents) {
            console.log("Sending to collector ID:", collector.$id);
            const success = await MobileNotificationService.send(
                collector.$id,
                `Test Bill`,
                `This is a test bill`,
                'bill_generated'
            );
            console.log("Send success for", collector.$id, "?", success);
        }
    } catch (e) {
        console.error("Error:", e);
    }
}

run();
