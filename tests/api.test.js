const request = require('supertest');
const { app } = require('../src/app');

describe('User Management APIs', () => {
  describe('GET /api/users/profile', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .expect(401);
    });
  });

  describe('PUT /api/users/profile', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .put('/api/users/profile')
        .send({ name: 'Test User' })
        .expect(401);
    });
  });

  describe('PUT /api/users/preferences', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .put('/api/users/preferences')
        .send({ theme: 'dark' })
        .expect(401);
    });
  });

  describe('POST /api/users/change-password', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/users/change-password')
        .send({ currentPassword: 'old', newPassword: 'new' })
        .expect(401);
    });
  });

  describe('DELETE /api/users/account', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .delete('/api/users/account')
        .expect(401);
    });
  });
});

describe('Message Management APIs', () => {
  describe('GET /api/messages/:id', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/messages/507f1f77bcf86cd799439011')
        .expect(401);
    });
  });

  describe('PUT /api/messages/:id', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .put('/api/messages/507f1f77bcf86cd799439011')
        .send({ content: 'Updated content' })
        .expect(401);
    });
  });

  describe('DELETE /api/messages/:id', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .delete('/api/messages/507f1f77bcf86cd799439011')
        .expect(401);
    });
  });

  describe('POST /api/messages/bulk-delete', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/messages/bulk-delete')
        .send({ messageIds: ['507f1f77bcf86cd799439011'] })
        .expect(401);
    });
  });
});

describe('Media Management APIs', () => {
  describe('POST /api/media/upload', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/media/upload')
        .send({ file: 'test' })
        .expect(401);
    });
  });

  describe('POST /api/media/upload/batch', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/media/upload/batch')
        .send({ files: ['test1', 'test2'] })
        .expect(401);
    });
  });

  describe('DELETE /api/media/delete', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .delete('/api/media/delete')
        .send({ publicId: 'test' })
        .expect(401);
    });
  });

  describe('GET /api/media/:publicId', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/media/test-public-id')
        .expect(401);
    });
  });
});
