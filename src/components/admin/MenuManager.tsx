import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Table, Button, Space, Modal, Form, Input, Select, Switch, Tag, Badge, Typography, Row, Col, Empty, App as AntApp, Tooltip } from 'antd';
import { MenuOutlined, PlusOutlined, CrownOutlined, EditOutlined, PlusSquareOutlined, MinusSquareOutlined } from '@ant-design/icons';
import { supabase } from '../../lib/supabase';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const { Title, Text } = Typography;

const DraggableRow = ({ children, ...props }: any) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: props['data-row-key'],
  });

  const style: React.CSSProperties = {
    ...props.style,
    transform: CSS.Transform.toString(transform && { ...transform, scaleY: 1 }),
    transition,
    ...(isDragging ? { position: 'relative', zIndex: 9999, background: '#fafafa' } : {}),
  };

  return (
    <tr {...props} ref={setNodeRef} style={style} {...attributes}>
      {React.Children.map(children, (child) => {
        if ((child as any).key === 'sort') {
          return React.cloneElement(child, {
            children: (
              <MenuOutlined
                ref={setActivatorNodeRef}
                style={{ touchAction: 'none', cursor: 'grab', color: '#999' }}
                {...listeners}
              />
            ),
          });
        }
        return child;
      })}
    </tr>
  );
};

export default function MenuManager({ onMenusChange }: { onMenusChange?: (menus: any[]) => void }) {
  const [menus, setMenus] = useState<any[]>([]);
  const [rawMenus, setRawMenus] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null); // null = 새 생성
  const [saving, setSaving] = useState(false);
  const [expandedKeys, setExpandedKeys] = useState<readonly React.Key[]>([]);
  const [form] = Form.useForm();
  const { message: msg } = AntApp.useApp();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 }, // 5px 이상 드래그해야 시작
    })
  );

  // 사용 가능한 대메뉴 목록 (서브메뉴 상위 선택용)
  const parentOptions = menus;

  const fetchMenus = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('site_menus')
      .select('*')
      .order('order_index', { ascending: true });
    if (error) {
      msg.error('메뉴 데이터 로드 실패: ' + error.message);
    } else {
      const raw = data || [];
      setRawMenus(raw);
      const map: any = {};
      const roots: any[] = [];
      raw.forEach((item) => {
        map[item.id] = { ...item, key: item.id, children: [] };
      });
      raw.forEach((item) => {
        if (item.parent_id && map[item.parent_id]) {
          map[item.parent_id].children.push(map[item.id]);
        } else {
          roots.push(map[item.id]);
        }
      });
      Object.values(map).forEach((node: any) => {
        if (node.children.length === 0) delete node.children;
        else node.children.sort((a: any, b: any) => a.order_index - b.order_index);
      });
      roots.sort((a, b) => a.order_index - b.order_index);

      setMenus(roots);
      onMenusChange && onMenusChange(raw);
    }
    setLoading(false);
  }, [msg, onMenusChange]);

  useEffect(() => {
    fetchMenus();
  }, [fetchMenus]);

  // 모달 열기
  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ is_active: true, requires_admin: false, order_index: menus.length + 1 });
    setModalOpen(true);
  };

  const openEdit = (record: any) => {
    setEditing(record);
    form.setFieldsValue({
      parent_id: record.parent_id || null,
      name: record.name,
      path: record.path,
      order_index: record.order_index,
      requires_admin: record.requires_admin,
      is_active: record.is_active,
    });
    setModalOpen(true);
  };

  // 저장 (INSERT / UPDATE)
  const handleSave = async () => {
    const values = await form.validateFields();
    setSaving(true);
    const payload = {
      parent_id: values.parent_id || null,
      name: values.name.trim(),
      path: values.path?.trim() || null,
      order_index: Number(values.order_index) || 0,
      requires_admin: values.requires_admin ?? false,
      is_active: values.is_active ?? true,
      mod_date: new Date().toISOString(),
    };
    const { error } = editing
      ? await supabase.from('site_menus').update(payload).eq('id', editing.id)
      : await supabase.from('site_menus').insert(payload);
    setSaving(false);
    if (error) {
      msg.error('저장 실패: ' + error.message);
    } else {
      msg.success(editing ? '수정 완료!' : '메뉴가 추가되었습니다!');
      setModalOpen(false);
      fetchMenus();
    }
  };

  const onDragEnd = async ({ active, over }: any) => {
    if (active.id !== over?.id) {
      const activeItem = rawMenus.find((m) => m.id === active.id);
      const overItem = rawMenus.find((m) => m.id === over?.id);

      if (!activeItem || !overItem) return;

      if (activeItem.parent_id !== overItem.parent_id) {
        msg.warning('같은 그룹(동일한 부모 메뉴) 내에서만 순서를 변경할 수 있습니다.');
        return;
      }

      const group = rawMenus
        .filter((m) => m.parent_id === activeItem.parent_id)
        .sort((a, b) => a.order_index - b.order_index);

      const oldIndex = group.findIndex((m) => m.id === active.id);
      const newIndex = group.findIndex((m) => m.id === over.id);

      const newGroup = arrayMove(group, oldIndex, newIndex);

      const updates = newGroup.map((item, index) => ({
        ...item,
        order_index: index + 1,
      }));

      // 낙관적 업데이트
      setRawMenus((prev) =>
        prev.map((m) => {
          const updated = updates.find((u) => u.id === m.id);
          return updated ? updated : m;
        })
      );
      
      // DB 일괄 업데이트
      try {
        const updatePromises = updates.map((item) =>
          supabase.from('site_menus').update({ order_index: item.order_index }).eq('id', item.id)
        );
        await Promise.all(updatePromises);
        msg.success('메뉴 순서가 변경되었습니다.');
        fetchMenus(); // 순서 변경 후 트리 재구성
      } catch (e) {
        msg.error('메뉴 순서 변경 중 오류가 발생했습니다.');
      }
    }
  };

  const allKeys = useMemo(() => rawMenus.map(m => m.id), [rawMenus]);

  const columns = [
    { key: 'sort', width: 40, align: 'center' as const },
    {
      title: '메뉴명',
      key: 'name',
      render: (_: any, record: any) => (
        <Space style={{ paddingLeft: record.parent_id ? 24 : 0 }}>
          {record.parent_id ? (
            <Space size={4}>
              <span style={{ color: '#bfbfbf' }}>└</span>
              <Text>{record.name}</Text>
            </Space>
          ) : (
            <Badge color="orange" text={<strong>{record.name}</strong>} />
          )}
          {record.children && record.children.length > 0 && (
            <span
              style={{ cursor: 'pointer', color: '#1677ff', marginLeft: 4 }}
              onClick={(e) => {
                e.stopPropagation();
                if (expandedKeys.includes(record.id)) {
                  setExpandedKeys(expandedKeys.filter(k => k !== record.id));
                } else {
                  setExpandedKeys([...expandedKeys, record.id]);
                }
              }}
            >
              {expandedKeys.includes(record.id) ? <MinusSquareOutlined /> : <PlusSquareOutlined />}
            </span>
          )}
        </Space>
      ),
    },
    {
      title: '경로',
      dataIndex: 'path',
      key: 'path',
      render: (v: any) => <code style={{ fontSize: 12 }}>{v || '-'}</code>,
    },
    { title: '순서', dataIndex: 'order_index', key: 'order_index', width: 64, align: 'center' as const },
    {
      title: '관리자 전용',
      dataIndex: 'requires_admin',
      key: 'requires_admin',
      width: 100,
      align: 'center' as const,
      render: (v: any) =>
        v ? (
          <Tag color="gold" icon={<CrownOutlined />}>
            관리자
          </Tag>
        ) : (
          <Tag color="default">일반</Tag>
        ),
    },
    /* {
      title: '활성화',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 80,
      align: 'center' as const,
      render: (v: any) => (v ? <Tag color="success">활성</Tag> : <Tag color="error">비활성</Tag>),
    }, */
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
            checked={record.is_active}
            onChange={async (checked) => {
              const { error } = await supabase
                .from('site_menus')
                .update({ is_active: checked, mod_date: new Date().toISOString() })
                .eq('id', record.id);
              if (error) msg.error('상태 변경 실패: ' + error.message);
              else fetchMenus();
            }}
          />
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="admin-section-header">
        <MenuOutlined style={{ marginRight: 8, color: '#fa8c16' }} />
        <Title level={5} style={{ margin: 0 }}>
          사이트 메뉴 관리
        </Title>
        <Space style={{ marginLeft: 'auto' }}>
          <Button size="small" onClick={fetchMenus}>
            새로고침
          </Button>
          <Button size="small" type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            메뉴 추가
          </Button>
        </Space>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={allKeys} strategy={verticalListSortingStrategy}>
          <Table
            dataSource={menus}
            columns={columns}
            rowKey="id"
            loading={loading}
            size="small"
            pagination={false}
            scroll={{ x: true }}
            locale={{ emptyText: <Empty description="데이터가 없습니다" /> }}
            className="admin-table"
            expandable={{
              expandIconColumnIndex: -1, // 기본 위치의 아이콘 숨김
              expandedRowKeys: expandedKeys,
              onExpandedRowsChange: (keys) => setExpandedKeys(keys),
            }}
            components={{
              body: {
                row: DraggableRow,
              },
            }}
          />
        </SortableContext>
      </DndContext>

      {/* 추가/수정 모달 */}
      <Modal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSave}
        confirmLoading={saving}
        title={editing ? '메뉴 수정' : '메뉴 추가'}
        okText="저장"
        cancelText="취소"
        width={480}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item label="상위 메뉴 (없으면 대메뉴)" name="parent_id">
            <Select
              allowClear
              placeholder="대메뉴이면 비워두세요"
              options={parentOptions.map((m) => ({ value: m.id, label: m.name }))}
            />
          </Form.Item>
          <Row gutter={12}>
            <Col span={16}>
              <Form.Item
                label="메뉴명"
                name="name"
                rules={[{ required: true, message: '메뉴명을 입력해주세요.' }]}
              >
                <Input placeholder="메뉴명" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="순서" name="order_index">
                <Input type="number" min={0} placeholder="0" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="경로 (Path)" name="path">
            <Input placeholder="/board/notice" />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="관리자 전용" name="requires_admin" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="활성화" name="is_active" valuePropName="checked">
                <Switch defaultChecked />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}
