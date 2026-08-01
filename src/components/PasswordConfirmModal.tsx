import React, { useState } from 'react';
import { Modal, Form, Input, Button, Alert, Space } from 'antd';
import { LockOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth';

export default function PasswordConfirmModal({ open, onClose, onSuccess }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { verifyPassword } = useAuth();

  const handleClose = () => {
    form.resetFields();
    setErrorMsg('');
    onClose();
  };

  const handleSubmit = async (values) => {
    setErrorMsg('');
    setLoading(true);
    const result = await verifyPassword(values.password);
    setLoading(false);

    if (result.success) {
      form.resetFields();
      onSuccess(); // 인증 성공 -> 부모에서 페이지 전환
    } else {
      setErrorMsg(result.message);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      footer={null}
      width={400}
      title={
        <Space>
          <SafetyCertificateOutlined style={{ color: '#1677ff' }} />
          <span>본인 인증</span>
        </Space>
      }
      centered
      destroyOnHidden
    >
      <div style={{ marginBottom: 16, color: '#666', fontSize: 13 }}>
        안전한 정보 보호를 위해 비밀번호를 다시 한번 입력해주세요.
      </div>

      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          name="password"
          rules={[{ required: true, message: '비밀번호를 입력해주세요.' }]}
        >
          <Input.Password
            prefix={<LockOutlined style={{ color: '#bbb' }} />}
            placeholder="비밀번호"
            size="large"
            autoFocus
            autoComplete="current-password"
            onChange={() => setErrorMsg('')}
          />
        </Form.Item>

        {errorMsg && (
          <Form.Item style={{ marginBottom: 12 }}>
            <Alert type="error" message={errorMsg} showIcon style={{ borderRadius: 6 }} />
          </Form.Item>
        )}

        <Form.Item style={{ marginBottom: 0 }}>
          <Button type="primary" htmlType="submit" size="large" block loading={loading}>
            확인
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
}
