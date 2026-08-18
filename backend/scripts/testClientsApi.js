import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { handleClients } from '../api/clients.js';

async function runClientTests() {
  console.log('====================================================');
  console.log('🧪 Testing Manage Clients Backend API CRUD Suite');
  console.log('====================================================\n');

  try {
    // 1. GET all clients
    console.log('1. Testing GET /api/clients...');
    const getReq = { method: 'GET', user: { id: 1, vendor_id: 1, role: 'VENDOR_ADMIN' } };
    const getRes = await handleClients(getReq, [], new URLSearchParams());
    console.log(`   Status: ${getRes.status}`);
    console.log(`   Fetched ${getRes.body.length} client(s):`);
    getRes.body.forEach(c => {
      console.log(`     - [ID ${c.id}] ${c.name} (${c.industry}) | Projects: ${c.project_count || 0} | Status: ${c.status}`);
    });

    if (getRes.status !== 200 || !Array.isArray(getRes.body)) {
      throw new Error('GET /api/clients failed');
    }

    // 2. POST create new client
    console.log('\n2. Testing POST /api/clients (Create)...');
    const newClientPayload = {
      name: 'Test Innovation Partners Corp',
      contact_person: 'Jessica Taylor',
      contact_email: 'jessica.t@testinnovation.io',
      contact_phone: '+1 (555) 777-8899',
      industry: 'Technology & SaaS',
      address: '500 Tech Blvd, Austin, TX',
      status: 'ACTIVE'
    };

    const postReq = {
      method: 'POST',
      user: { id: 1, vendor_id: 1, role: 'VENDOR_ADMIN' },
      json: async () => newClientPayload
    };

    const postRes = await handleClients(postReq, [], new URLSearchParams());
    console.log(`   Status: ${postRes.status}`);
    console.log(`   Created Client ID: ${postRes.body.id} -> Name: "${postRes.body.name}"`);

    if (postRes.status !== 201 || !postRes.body.id) {
      throw new Error('POST /api/clients failed');
    }

    const createdId = String(postRes.body.id);

    // 3. PUT update client
    console.log(`\n3. Testing PUT /api/clients/${createdId} (Update)...`);
    const updatePayload = {
      name: 'Test Innovation Partners (Updated)',
      contact_person: 'Jessica Taylor-Smith',
      contact_email: 'jessica.ts@testinnovation.io',
      contact_phone: '+1 (555) 777-9900',
      industry: 'Financial Services',
      address: '700 Silicon Hills, Austin, TX',
      status: 'ACTIVE'
    };

    const putReq = {
      method: 'PUT',
      user: { id: 1, vendor_id: 1, role: 'VENDOR_ADMIN' },
      json: async () => updatePayload
    };

    const putRes = await handleClients(putReq, [createdId], new URLSearchParams());
    console.log(`   Status: ${putRes.status}`);
    console.log(`   Updated Client: "${putRes.body.name}" | Contact: "${putRes.body.contact_person}" | Industry: "${putRes.body.industry}"`);

    if (putRes.status !== 200 || putRes.body.name !== 'Test Innovation Partners (Updated)') {
      throw new Error('PUT /api/clients failed');
    }

    // 4. DELETE client
    console.log(`\n4. Testing DELETE /api/clients/${createdId} (Delete)...`);
    const delReq = {
      method: 'DELETE',
      user: { id: 1, vendor_id: 1, role: 'VENDOR_ADMIN' }
    };

    const delRes = await handleClients(delReq, [createdId], new URLSearchParams());
    console.log(`   Status: ${delRes.status}`);
    console.log(`   Response: ${JSON.stringify(delRes.body)}`);

    if (delRes.status !== 200) {
      throw new Error('DELETE /api/clients failed');
    }

    // 5. Verify deletion
    console.log(`\n5. Verifying Client ${createdId} is Deleted...`);
    const verifyGet = await handleClients({ method: 'GET', user: { id: 1 } }, [createdId], new URLSearchParams());
    console.log(`   Get Deleted Client Status: ${verifyGet.status} (${verifyGet.body.error || 'Found'})`);

    if (verifyGet.status !== 404) {
      throw new Error('Client was not properly deleted');
    }

    console.log('\n====================================================');
    console.log('🎉 ALL CLIENT API TESTS PASSED SUCCESSFULLY!');
    console.log('====================================================\n');
  } catch (err) {
    console.error('❌ Test suite failed with error:', err);
    process.exit(1);
  }

  process.exit(0);
}

runClientTests();
