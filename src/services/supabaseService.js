import { supabase } from '@/config/supabase'

class SupabaseService {
  // 认证相关
  async signUp(email, password) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    })
    return { data, error }
  }

  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    return { data, error }
  }

  async signOut() {
    const { error } = await supabase.auth.signOut()
    return { error }
  }

  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser()
    return { user, error }
  }

  // 数据库操作 - 通用方法
  async select(table, options = {}) {
    let query = supabase.from(table).select('*')
    
    if (options.columns) {
      query = supabase.from(table).select(options.columns)
    }
    
    if (options.eq) {
      Object.entries(options.eq).forEach(([key, value]) => {
        query = query.eq(key, value)
      })
    }
    
    if (options.order) {
      query = query.order(options.order.column, { ascending: options.order.ascending })
    }
    
    if (options.limit) {
      query = query.limit(options.limit)
    }
    
    const { data, error } = await query
    return { data, error }
  }

  async insert(table, data) {
    const { data: result, error } = await supabase
      .from(table)
      .insert(data)
      .select()
    return { data: result, error }
  }

  async update(table, updates, condition) {
    let query = supabase.from(table).update(updates)
    
    if (condition.eq) {
      Object.entries(condition.eq).forEach(([key, value]) => {
        query = query.eq(key, value)
      })
    }
    
    const { data: result, error } = await query.select()
    return { data: result, error }
  }

  async delete(table, condition) {
    let query = supabase.from(table).delete()
    
    if (condition.eq) {
      Object.entries(condition.eq).forEach(([key, value]) => {
        query = query.eq(key, value)
      })
    }
    
    const { data, error } = await query.select()
    return { data, error }
  }

  // 文件上传
  async uploadFile(bucket, path, file) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file)
    return { data, error }
  }

  async getPublicUrl(bucket, path) {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path)
    return data.publicUrl
  }
}

export default new SupabaseService()