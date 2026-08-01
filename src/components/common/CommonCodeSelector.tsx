import React, { useEffect, useState } from 'react';
import { Select, Spin } from 'antd';
import { supabase } from '../../lib/supabase';

interface CommonCodeSelectorProps {
  parentCode: string;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
}

export default function CommonCodeSelector({
  parentCode,
  value,
  onChange,
  placeholder = '선택해주세요',
  style,
  disabled = false,
}: CommonCodeSelectorProps) {
  const [options, setOptions] = useState<{ label: string; value: string }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchCodes() {
      if (!parentCode) {
        setOptions([]);
        return;
      }
      setLoading(true);
      const { data, error } = await supabase
        .from('common_code')
        .select('cc_code, cc_desc')
        .eq('cc_parent_code', parentCode)
        .eq('cc_use_yn', 'Y')
        .order('cc_order', { ascending: true });

      if (data && !error) {
        setOptions(data.map((item) => ({ label: item.cc_desc || item.cc_code, value: item.cc_code })));
      }
      setLoading(false);
    }
    
    fetchCodes();
  }, [parentCode]);

  return (
    <Select
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      style={{ width: '100%', ...style }}
      loading={loading}
      disabled={disabled}
      options={options}
      notFoundContent={loading ? <Spin size="small" /> : null}
      allowClear
    />
  );
}
