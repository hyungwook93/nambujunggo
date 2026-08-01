import React, { useState } from 'react';
import { Modal, Form, Input, Button, Space, Typography, Divider, Alert } from 'antd';
import { UserOutlined, LockOutlined, LoginOutlined, UserAddOutlined } from '@ant-design/icons';

const { Text } = Typography;

export default function LoginModal({ open, onClose, onLogin, onGoSignup, loading }) {
  const [form] = Form.useForm();
  const [errorMsg, setErrorMsg] = useState('');
  const [locked, setLocked] = useState(false);

  const handleSubmit = async (values) => {
    setErrorMsg('');
    setLocked(false);
    const result = await onLogin(values.userId, values.password);
    if (result.success) {
      form.resetFields();
      onClose();
    } else {
      setErrorMsg(result.message);
      if (result.locked) setLocked(true);
    }
  };

  const handleClose = () => {
    form.resetFields();
    setErrorMsg('');
    setLocked(false);
    onClose();
  };

  const handleGoSignup = () => {
    handleClose();
    onGoSignup();
  };

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      footer={null}
      width={400}
      title={
        <Space>
          <LoginOutlined style={{ color: '#1677ff' }} />
          <span>로그인</span>
        </Space>
      }
      centered
      destroyOnHidden
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 8 }}>
        <Form.Item
          name="userId"
          rules={[
            { required: true, message: '아이디를 입력해주세요.' },
            { min: 4, message: '아이디는 4자 이상이어야 합니다.' },
            { max: 30, message: '아이디는 30자 이하이어야 합니다.' },
            { pattern: /^[a-z0-9_]+$/, message: '영소문자, 숫자, _만 사용 가능합니다.' },
          ]}
        >
          <Input
            prefix={<UserOutlined style={{ color: '#bbb' }} />}
            placeholder="아이디 (영소문자·숫자·_ / 4~30자)"
            size="large"
            autoComplete="username"
            onChange={() => {
              if (errorMsg) {
                setErrorMsg('');
                setLocked(false);
              }
            }}
          />
        </Form.Item>

        <Form.Item
          name="password"
          rules={[
            { required: true, message: '비밀번호를 입력해주세요.' },
            { min: 8, message: '비밀번호는 8자 이상이어야 합니다.' },
            { whitespace: false, message: '비밀번호에 공백을 사용할 수 없습니다.' },
            {
              validator(_, value) {
                if (!value || /\s/.test(value))
                  return Promise.reject(new Error('비밀번호에 공백을 사용할 수 없습니다.'));
                return Promise.resolve();
              },
            },
          ]}
        >
          <Input.Password
            prefix={<LockOutlined style={{ color: '#bbb' }} />}
            placeholder="비밀번호 (8자 이상)"
            size="large"
            autoComplete="current-password"
            onChange={() => {
              if (errorMsg) {
                setErrorMsg('');
                setLocked(false);
              }
            }}
          />
        </Form.Item>

        {errorMsg && (
          <Form.Item style={{ marginBottom: 8 }}>
            <Alert
              type={locked ? 'error' : 'warning'}
              message={errorMsg}
              showIcon
              style={{ borderRadius: 6 }}
            />
          </Form.Item>
        )}

        <Form.Item style={{ marginBottom: 0 }}>
          <Button
            type="primary"
            htmlType="submit"
            size="large"
            block
            loading={loading}
            icon={<LoginOutlined />}
          >
            로그인
          </Button>
        </Form.Item>
      </Form>

      {/* 구분선: 로그인 ↔ 회원가입 */}
      <Divider style={{ margin: '16px 0' }}>
        <Text style={{ fontSize: 12, color: '#aaa' }}>또는</Text>
      </Divider>

      <Button
        block
        size="large"
        icon={<UserAddOutlined />}
        onClick={handleGoSignup}
        style={{ borderColor: '#d9d9d9' }}
      >
        회원가입
      </Button>
    </Modal>
  );
}
