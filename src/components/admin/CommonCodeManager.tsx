import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Space, Modal, Form, Input, Select, Switch, Tag, Typography, Row, Col, Empty, App as AntApp, Tooltip, Badge } from 'antd';
import { AppstoreOutlined, PlusOutlined, EditOutlined, PlusSquareOutlined, MinusSquareOutlined } from '@ant-design/icons';
import { supabase } from '../../lib/supabase';

const { Title, Text } = Typography;

export default function CommonCodeManager() {
  const [codes, setCodes] = useState<any[]>([]);
  const [rawCodes, setRawCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [expandedKeys, setExpandedKeys] = useState<readonly React.Key[]>([]);
  const [form] = Form.useForm();
  const { message: msg } = AntApp.useApp();

  const fetchCodes = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('common_code')
      .select('*')
      .order('cc_order', { ascending: true });
    
    if (error) {
      if (error.code === '42P01') {
        msg.warning('common_code 테이블이 아직 생성되지 않았습니다. SQL을 실행해주세요.');
      } else {
        msg.error('데이터 로드 실패: ' + error.message);
      }
      setLoading(false);
      return;
    }

    const raw = data || [];
    setRawCodes(raw);
    const map: any = {};
    const roots: any[] = [];
    raw.forEach((item) => {
      map[item.cc_code] = { ...item, key: item.cc_code, children: [] };
    });
    raw.forEach((item) => {
      if (item.cc_parent_code && map[item.cc_parent_code]) {
        map[item.cc_parent_code].children.push(map[item.cc_code]);
      } else {
        roots.push(map[item.cc_code]);
      }
    });
    Object.values(map).forEach((node: any) => {
      if (node.children.length === 0) delete node.children;
      else node.children.sort((a: any, b: any) => a.cc_order - b.cc_order);
    });
    roots.sort((a, b) => a.cc_order - b.cc_order);

    setCodes(roots);
    setLoading(false);
  }, [msg]);

  useEffect(() => {
    fetchCodes();
  }, [fetchCodes]);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    const rootCount = rawCodes.filter((c) => !c.cc_parent_code).length;
    form.setFieldsValue({ cc_use_yn: true, cc_order: rootCount + 1 });
    setModalOpen(true);
  };

  const openCreateSub = (parentCode: string) => {
    setEditing(null);
    form.resetFields();
    const subCount = rawCodes.filter((c) => c.cc_parent_code === parentCode).length;
    form.setFieldsValue({ cc_parent_code: parentCode, cc_use_yn: true, cc_order: subCount + 1 });
    setModalOpen(true);
  };

  const openEdit = (record: any) => {
    setEditing(record);
    form.setFieldsValue({
      cc_code: record.cc_code,
      cc_parent_code: record.cc_parent_code || null,
      cc_desc: record.cc_desc,
      cc_order: record.cc_order,
      cc_use_yn: record.cc_use_yn === 'Y',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    setSaving(true);
    const payload = {
      cc_code: values.cc_code.trim(),
      cc_parent_code: values.cc_parent_code || null,
      cc_desc: values.cc_desc?.trim() || null,
      cc_order: Number(values.cc_order) || 0,
      cc_use_yn: values.cc_use_yn ? 'Y' : 'N',
      mod_date: new Date().toISOString(),
    };

    let error;
    if (editing) {
      const res = await supabase.from('common_code').update(payload).eq('cc_code', editing.cc_code);
      error = res.error;
    } else {
      const res = await supabase.from('common_code').insert(payload);
      error = res.error;
    }

    setSaving(false);
    if (error) {
      msg.error('저장 실패: ' + error.message);
    } else {
      msg.success(editing ? '수정 완료!' : '코드가 추가되었습니다!');
      setModalOpen(false);
      fetchCodes();
    }
  };

  const columns = [
    {
      title: '공통코드',
      key: 'cc_code',
      render: (_: any, record: any) => (
        <Space style={{ paddingLeft: record.cc_parent_code ? 24 : 0 }}>
          {record.cc_parent_code && (
            <span style={{ color: '#bfbfbf' }}>└</span>
          )}

          {record.children && record.children.length > 0 && (
            <span
              style={{ cursor: 'pointer', color: '#1677ff', marginRight: 4 }}
              onClick={(e) => {
                e.stopPropagation();
                if (expandedKeys.includes(record.cc_code)) {
                  setExpandedKeys(expandedKeys.filter(k => k !== record.cc_code));
                } else {
                  setExpandedKeys([...expandedKeys, record.cc_code]);
                }
              }}
            >
              {expandedKeys.includes(record.cc_code) ? <MinusSquareOutlined /> : <PlusSquareOutlined />}
            </span>
          )}
          
          <Text strong>{record.cc_code}</Text>
          
          <Tooltip title="하위 코드 추가">
            <Button
              type="text"
              size="small"
              icon={<PlusOutlined style={{ color: '#1677ff' }} />}
              onClick={(e) => {
                e.stopPropagation();
                openCreateSub(record.cc_code);
              }}
            />
          </Tooltip>
        </Space>
      ),
    },
    {
      title: '코드 설명',
      dataIndex: 'cc_desc',
      key: 'cc_desc',
    },
    { title: '순서', dataIndex: 'cc_order', key: 'cc_order', width: 64, align: 'center' as const },
    {
      title: '사용여부',
      dataIndex: 'cc_use_yn',
      key: 'cc_use_yn',
      width: 100,
      align: 'center' as const,
      render: (v: string) => (v === 'Y' ? <Tag color="success">사용</Tag> : <Tag color="error">미사용</Tag>),
    },
    {
      title: '관리',
      key: 'action',
      width: 160,
      align: 'center' as const,
      render: (_: any, record: any) => (
        <Space size={8}>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>
            수정
          </Button>
          <Switch
            checkedChildren="사용"
            unCheckedChildren="미사용"
            checked={record.cc_use_yn === 'Y'}
            onChange={async (checked) => {
              const { error } = await supabase
                .from('common_code')
                .update({ cc_use_yn: checked ? 'Y' : 'N', mod_date: new Date().toISOString() })
                .eq('cc_code', record.cc_code);
              if (error) msg.error('상태 변경 실패: ' + error.message);
              else fetchCodes();
            }}
          />
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="admin-section-header">
        <AppstoreOutlined style={{ marginRight: 8, color: '#1677ff' }} />
        <Title level={5} style={{ margin: 0 }}>
          공통코드 관리
        </Title>
        <Space style={{ marginLeft: 'auto' }}>
          <Button size="small" onClick={fetchCodes}>
            새로고침
          </Button>
          <Button size="small" type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            코드 추가
          </Button>
        </Space>
      </div>

      <Table
        dataSource={codes}
        columns={columns}
        rowKey="cc_code"
        loading={loading}
        size="small"
        pagination={false}
        scroll={{ x: true }}
        locale={{ emptyText: <Empty description="데이터가 없습니다" /> }}
        className="admin-table"
        expandable={{
          expandIconColumnIndex: -1,
          expandedRowKeys: expandedKeys,
          onExpandedRowsChange: (keys) => setExpandedKeys(keys),
        }}
      />

      <Modal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSave}
        confirmLoading={saving}
        title={editing ? '코드 수정' : '코드 추가'}
        okText="저장"
        cancelText="취소"
        width={480}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item label="부모 코드 (없으면 최상위)" name="cc_parent_code">
            <Select
              allowClear
              placeholder="최상위 코드이면 비워두세요"
              options={rawCodes.map((c) => ({ value: c.cc_code, label: `${c.cc_code} (${c.cc_desc})` }))}
              disabled
            />
          </Form.Item>
          <Row gutter={12}>
            <Col span={16}>
              <Form.Item
                label="공통 코드"
                name="cc_code"
                rules={[{ required: true, message: '코드를 입력해주세요.' }]}
              >
                <Input placeholder="SYS_01" disabled={editing != null} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="등록 순번" name="cc_order">
                <Input disabled />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="코드 설명" name="cc_desc">
            <Input placeholder="코드에 대한 설명" />
          </Form.Item>
          <Form.Item label="사용 여부" name="cc_use_yn" valuePropName="checked">
            <Switch defaultChecked />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
