// 执行数据库迁移脚本
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigrations() {
  try {
    // 读取SQL语句
    const sql = fs.readFileSync('add_columns.sql', 'utf8');
    
    console.log('开始执行数据库迁移...');
    console.log('SQL语句:', sql);
    
    // 执行SQL语句
    const { data, error } = await supabase.rpc('execute_sql', { sql: sql });
    
    if (error) {
      console.error('迁移失败:', error);
      process.exit(1);
    }
    
    console.log('迁移成功! 已添加缺失的列。');
    
    // 检查列是否成功添加
    const { data: columns, error: columnsError } = await supabase.rpc('execute_sql', { 
      sql: 'SELECT column_name FROM information_schema.columns WHERE table_name = \'contract_analyses\'' 
    });
    
    if (!columnsError) {
      console.log('\ncontract_analyses表的列:', columns);
    }
    
  } catch (err) {
    console.error('脚本执行错误:', err);
    process.exit(1);
  }
}

runMigrations();