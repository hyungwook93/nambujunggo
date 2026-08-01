import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Space,
  Typography,
  Row,
  Col,
  message as antMessage,
  Divider,
  Alert,
  Spin,
} from 'antd';
import {
  UserOutlined,
  LockOutlined,
  PhoneOutlined,
  MailOutlined,
  HomeOutlined,
  ArrowLeftOutlined,
  SearchOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth';

const { Title, Text } = Typography;

// 카카오 주소 API 스크립트 동적 로드
function loadDaumPostcode() {
  return new Promise((resolve) => {
    if (window.daum && window.daum.Postcode) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
    script.onload = resolve;
    document.head.appendChild(script);
  });
}

export default function ProfilePage({ onBack }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { getUserInfo, updateProfile } = useAuth();

  useEffect(() => {
    async function loadData() {
      const data = await getUserInfo();
      if (data) {
        form.setFieldsValue({
          userId: data.user_id,
          userName: data.user_name,
          phone: data.user_phone,
          email: data.user_email,
          address: data.user_address,
          addressDetail: data.user_address_detail,
        });
      }
      setLoading(false);
    }
    loadData();
  }, [getUserInfo, form]);

  const handleAddressSearch = async () => {
    await loadDaumPostcode();
    new window.daum.Postcode({
      oncomplete(data) {
        const addr = data.roadAddress || data.jibunAddress;
        form.setFieldsValue({ address: addr, addressDetail: '' });
        document.getElementById('profile-addressDetail')?.focus();
      },
    }).open();
  };

  const handleSubmit = async (values) => {
    setErrorMsg('');
    setSubmitting(true);

    // 빈 문자열인 경우 null로 처리
    const formData = {
      userName: values.userName.trim(),
      phone: values.phone?.trim() || null,
      email: values.email?.trim() || null,
      address: values.address?.trim() || null,
      addressDetail: values.addressDetail?.trim() || null,
      password: values.password || null, // 비어있으면 변경 안 함
    };

    const result = await updateProfile(formData);
    setSubmitting(false);

    if (result.success) {
      antMessage.success('정보가 성공적으로 수정되었습니다.');
      form.setFieldsValue({ password: '', passwordConfirm: '' }); // 비밀번호 필드 초기화
    } else {
      setErrorMsg(result.message);
    }
  };

  if (loading) {
    return (
      <div className="signup-page" style={{ alignItems: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="signup-page">
      <Card className="signup-card">
        {/* 헤더 */}
        <div className="signup-header">
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={onBack}
            style={{ marginBottom: 8 }}
          >
            돌아가기
          </Button>
          <Title level={3} style={{ margin: 0 }}>
            정보 수정
          </Title>
          <Text type="secondary">내 계정 정보를 최신으로 유지하세요</Text>
        </div>

        <Divider />

        {errorMsg && (
          <Alert
            type="error"
            message={errorMsg}
            showIcon
            style={{ marginBottom: 16, borderRadius: 6 }}
          />
        )}

        <Form form={form} layout="vertical" onFinish={handleSubmit} scrollToFirstError>
          {/* 아이디 (수정 불가) */}
          <Form.Item label="아이디" name="userId">
            <Input prefix={<UserOutlined style={{ color: '#bbb' }} />} disabled />
          </Form.Item>

          {/* 이름 */}
          <Form.Item
            label="이름"
            name="userName"
            rules={[{ required: true, message: '이름을 입력해주세요.' }, { max: 10 }]}
          >
            <Input prefix={<UserOutlined style={{ color: '#bbb' }} />} placeholder="이름" />
          </Form.Item>

          {/* 새 비밀번호 변경 (선택) */}
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                label={
                  <span>
                    새 비밀번호{' '}
                    <Text type="secondary" style={{ fontSize: 12, fontWeight: 'normal' }}>
                      (변경 시에만 입력)
                    </Text>
                  </span>
                }
                name="password"
                rules={[
                  { min: 8, message: '비밀번호는 8자 이상이어야 합니다.' },
                  { whitespace: false, message: '비밀번호에 공백을 사용할 수 없습니다.' },
                  {
                    validator(_, value) {
                      if (value && /\s/.test(value))
                        return Promise.reject(new Error('비밀번호에 공백을 사용할 수 없습니다.'));
                      return Promise.resolve();
                    },
                  },
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: '#bbb' }} />}
                  placeholder="새 비밀번호"
                  autoComplete="new-password"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="새 비밀번호 확인"
                name="passwordConfirm"
                dependencies={['password']}
                rules={[
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!getFieldValue('password') || getFieldValue('password') === value)
                        return Promise.resolve();
                      return Promise.reject(new Error('비밀번호가 일치하지 않습니다.'));
                    },
                  }),
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: '#bbb' }} />}
                  placeholder="새 비밀번호 확인"
                  autoComplete="new-password"
                />
              </Form.Item>
            </Col>
          </Row>

          {/* 휴대전화 */}
          <Form.Item
            label="휴대전화"
            name="phone"
            rules={[
              {
                pattern: /^01[016789]-\d{3,4}-\d{4}$/,
                message: '형식: 010-1234-5678',
              },
            ]}
          >
            <Input
              prefix={<PhoneOutlined style={{ color: '#bbb' }} />}
              placeholder="010-1234-5678"
              maxLength={13}
              onChange={(e) => {
                let v = e.target.value.replace(/\D/g, '');
                if (v.length <= 3) form.setFieldValue('phone', v);
                else if (v.length <= 7)
                  form.setFieldValue('phone', `${v.slice(0, 3)}-${v.slice(3)}`);
                else
                  form.setFieldValue(
                    'phone',
                    `${v.slice(0, 3)}-${v.slice(3, 7)}-${v.slice(7, 11)}`
                  );
              }}
            />
          </Form.Item>

          {/* 이메일 */}
          <Form.Item
            label="이메일"
            name="email"
            rules={[{ type: 'email', message: '올바른 이메일 형식으로 입력해주세요.' }]}
          >
            <Input
              prefix={<MailOutlined style={{ color: '#bbb' }} />}
              placeholder="example@email.com"
              maxLength={50}
            />
          </Form.Item>

          {/* 주소 */}
          <Form.Item label="주소" name="address">
            <Input.Search
              prefix={<HomeOutlined style={{ color: '#bbb' }} />}
              placeholder="주소 검색 버튼을 클릭하세요"
              readOnly
              enterButton="주소 검색"
              onSearch={handleAddressSearch}
              onClick={handleAddressSearch}
            />
          </Form.Item>

          {/* 상세주소 */}
          <Form.Item label="상세주소" name="addressDetail">
            <Input
              id="profile-addressDetail"
              prefix={<HomeOutlined style={{ color: '#bbb' }} />}
              placeholder="동/호수, 건물명 등 상세 주소"
              maxLength={50}
            />
          </Form.Item>

          {/* 제출 버튼 */}
          <Form.Item style={{ marginTop: 16, marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={submitting}
              icon={<SaveOutlined />}
            >
              수정 완료
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
