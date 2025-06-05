// Simple SQL schema validation script
// Checks for common issues that might cause problems in Supabase

const fs = require('fs');
const path = require('path');

console.log('🔍 Validating Duvall Farmers Market Database Schema...\n');

function validateSchema() {
    try {
        // Read the schema file
        const schemaPath = path.join(__dirname, 'database', 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        
        console.log('✅ Schema file read successfully');
        
        // Check for problematic patterns
        const issues = [];
        
        // Check 1: CURRENT_DATABASE() usage
        if (schema.includes('CURRENT_DATABASE()')) {
            issues.push('❌ Found CURRENT_DATABASE() usage - not supported in Supabase');
        } else {
            console.log('✅ No CURRENT_DATABASE() usage found');
        }
        
        // Check 2: CURRENT_DATE in index predicates
        const indexCurrentDateRegex = /CREATE\s+INDEX.*WHERE.*CURRENT_DATE/gi;
        const indexMatches = schema.match(indexCurrentDateRegex);
        if (indexMatches) {
            issues.push(`❌ Found CURRENT_DATE in index WHERE clause: ${indexMatches.length} instances`);
        } else {
            console.log('✅ No CURRENT_DATE in index predicates');
        }
        
        // Check 3: Basic SQL syntax patterns
        const tableCount = (schema.match(/CREATE TABLE/gi) || []).length;
        const indexCount = (schema.match(/CREATE INDEX/gi) || []).length;
        const functionCount = (schema.match(/CREATE OR REPLACE FUNCTION/gi) || []).length;
        const triggerCount = (schema.match(/CREATE TRIGGER/gi) || []).length;
        
        console.log(`✅ Found ${tableCount} tables`);
        console.log(`✅ Found ${indexCount} indexes`);
        console.log(`✅ Found ${functionCount} functions`);
        console.log(`✅ Found ${triggerCount} triggers`);
        
        // Check 4: UUID extension
        if (schema.includes('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')) {
            console.log('✅ UUID extension enabled');
        } else {
            issues.push('❌ UUID extension not found');
        }
        
        // Check 5: Row Level Security
        if (schema.includes('ENABLE ROW LEVEL SECURITY')) {
            console.log('✅ Row Level Security configured');
        } else {
            issues.push('❌ Row Level Security not found');
        }
        
        // Check 6: Essential tables
        const requiredTables = ['vendors', 'products', 'market_dates', 'orders', 'admin_users'];
        requiredTables.forEach(table => {
            if (schema.includes(`CREATE TABLE ${table}`)) {
                console.log(`✅ Table '${table}' found`);
            } else {
                issues.push(`❌ Required table '${table}' not found`);
            }
        });
        
        // Final validation
        if (issues.length === 0) {
            console.log('\n🎉 Schema validation PASSED!');
            console.log('✅ Ready for Supabase deployment');
            
            // Check initial data file too
            try {
                const initialDataPath = path.join(__dirname, 'database', 'initial-data.sql');
                const initialData = fs.readFileSync(initialDataPath, 'utf8');
                console.log('✅ Initial data file found');
                
                if (initialData.includes('INSERT INTO market_dates')) {
                    console.log('✅ Market dates insertion ready');
                }
                if (initialData.includes('INSERT INTO admin_users')) {
                    console.log('✅ Admin user insertion ready');
                }
                
            } catch (e) {
                console.log('⚠️  Initial data file not found (optional)');
            }
            
        } else {
            console.log('\n❌ Schema validation FAILED!');
            issues.forEach(issue => console.log(issue));
        }
        
        console.log('\n📝 Next Steps:');
        console.log('1. Create Supabase project');
        console.log('2. Run schema.sql in SQL Editor');
        console.log('3. Run initial-data.sql for sample data');
        console.log('4. Update .env.local with your credentials');
        
    } catch (error) {
        console.error('❌ Error reading schema file:', error.message);
    }
}

// Run validation
validateSchema(); 