require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { execSync } = require('child_process');

module.exports = async () => {
  const testDbUrl =
    process.env.DATABASE_URL_TEST ||
    'postgresql://admin:password123@localhost:5432/eventia_test';

  console.log('\n🗄️  Pushing schema to test database...');
  execSync(`npx prisma db push --url "${testDbUrl}" --accept-data-loss`, {
    cwd: __dirname,
    stdio: 'pipe',
  });
  console.log('✅ Test database ready\n');
};
