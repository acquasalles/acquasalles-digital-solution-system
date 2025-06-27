import { supabase } from './supabase';

export async function uploadLogo(): Promise<string | null> {
  try {
    // Fetch the logo from the external URL
    const response = await fetch('https://acquasalles.com.br/wp-content/uploads/2021/06/logo-acquasalles.png?v=1', {
      mode: 'cors',
      cache: 'no-cache',
      credentials: 'omit',
      headers: {
        'Accept': 'image/webp,image/png,image/*,*/*;q=0.8',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });

    if (!response.ok) {
      console.error('Failed to fetch logo:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });
      return null;
    }

    const blob = await response.blob();
    
    if (blob.size === 0) {
      console.error('Received empty blob');
      return null;
    }

    // Check if file already exists
    const { data: existingFile } = await supabase.storage
      .from('logos')
      .list('', {
        search: 'acquasalles-logo.png'
      });

    // If file exists, remove it first
    if (existingFile && existingFile.length > 0) {
      await supabase.storage
        .from('logos')
        .remove(['acquasalles-logo.png']);
    }

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('logos')
      .upload('acquasalles-logo.png', blob, {
        cacheControl: '3600',
        upsert: true,
        contentType: 'image/png'
      });

    if (error) throw error;

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from('logos')
      .getPublicUrl('acquasalles-logo.png');

    return urlData?.publicUrl || null;
  } catch (error) {
    console.error('Error uploading logo:', error instanceof Error ? error.message : error);
    return null;
  }
}