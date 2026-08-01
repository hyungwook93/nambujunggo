import React, { useState, useRef, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Space,
  Typography,
  Row,
  Col,
  Steps,
  message as antMessage,
  Divider,
  Alert,
} from 'antd';
import {
  UserOutlined,
  LockOutlined,
  PhoneOutlined,
  MailOutlined,
  HomeOutlined,
  ArrowLeftOutlined,
  CheckCircleOutlined,
  SearchOutlined,
} from '@ant-design/icons';

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

export default function SignupPage({ onBack, onSuccess, checkDuplicateId, register }) {
  const [form] = Form.useForm();
  const [idChecked, setIdChecked] = useState(false); // 중복확인 완료 여부
  const [idAvailable, setIdAvailable] = useState(null); // null | true | false
  const [checkingId, setCheckingId] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [done, setDone] = useState(false);

  // 아이디 변경 시 중복확인 초기화
  const handleIdChange = () => {
    setIdChecked(false);
    setIdAvailable(null);
  };

  // 아이디 중복 확인
  const handleCheckId = async () => {
    const userId = form.getFieldValue('userId');
    if (!userId || userId.trim().length < 4) {
      antMessage.warning('아이디는 4자 이상 입력해주세요.');
      return;
    }
    setCheckingId(true);
    const isDup = await checkDuplicateId(userId.trim());
    setCheckingId(false);
    setIdChecked(true);
    setIdAvailable(!isDup);
    if (isDup) antMessage.error('이미 사용 중인 아이디입니다.');
    else antMessage.success('사용 가능한 아이디입니다!');
  };

  // 카카오 주소 검색 팝업
  const handleAddressSearch = async () => {
    await loadDaumPostcode();
    new window.daum.Postcode({
      oncomplete(data) {
        // 도로명 주소 우선, 없으면 지번
        const addr = data.roadAddress || data.jibunAddress;
        form.setFieldsValue({ address: addr, addressDetail: '' });
        // 상세주소 인풋에 포커스
        document.getElementById('signup-addressDetail')?.focus();
      },
    }).open();
  };

  // 제출
  const handleSubmit = async (values) => {
    if (!idChecked || !idAvailable) {
      antMessage.warning('아이디 중복 확인을 완료해주세요.');
      return;
    }
    setErrorMsg('');
    setSubmitting(true);
    const result = await register({
      userId: values.userId.trim(),
      userName: values.userName.trim(),
      password: values.password,
      phone: values.phone?.trim() || null,
      email: values.email?.trim() || null,
      address: values.address?.trim() || null,
      addressDetail: values.addressDetail?.trim() || null,
    });
    setSubmitting(false);
    if (result.success) {
      setDone(true);
    } else {
      setErrorMsg(result.message);
    }
  };

  // 완료 화면
  if (done) {
    return (
      <div className="signup-page">
        <Card className="signup-card" style={{ textAlign: 'center', padding: 40 }}>
          <CheckCircleOutlined style={{ fontSize: 64, color: '#52c41a', marginBottom: 16 }} />
          <Title level={3}>회원가입 완료!</Title>
          <Text type="secondary">로그인하여 서비스를 이용해보세요.</Text>
          <div style={{ marginTop: 24 }}>
            <Button type="primary" size="large" onClick={onSuccess} icon={<ArrowLeftOutlined />}>
              로그인하러 가기
            </Button>
          </div>
        </Card>
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
            회원가입
          </Title>
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
          {/* 아이디 */}
          <Form.Item label="아이디" required style={{ marginBottom: 0 }}>
            <Space.Compact style={{ width: '100%' }}>
              <Form.Item
                name="userId"
                noStyle
                rules={[
                  { required: true, message: '아이디를 입력해주세요.' },
                  { min: 4, message: '4자 이상 입력해주세요.' },
                  { max: 30, message: '30자 이하로 입력해주세요.' },
                  { pattern: /^[a-z0-9_]+$/, message: '영소문자, 숫자, _만 사용 가능합니다.' },
                ]}
              >
                <Input
                  prefix={<UserOutlined style={{ color: '#bbb' }} />}
                  placeholder="영소문자, 숫자, _ (4~30자)"
                  onChange={(e) => {
                    handleIdChange();
                  }}
                  status={idChecked ? (idAvailable ? 'success' : 'error') : ''}
                />
              </Form.Item>
              <Button
                onClick={handleCheckId}
                loading={checkingId}
                type={idAvailable === true ? 'default' : 'primary'}
                icon={<CheckCircleOutlined />}
                style={idAvailable === true ? { borderColor: '#52c41a', color: '#52c41a' } : {}}
              >
                중복확인
              </Button>
            </Space.Compact>
            {idChecked && (
              <Text style={{ fontSize: 12, color: idAvailable ? '#52c41a' : '#ff4d4f' }}>
                {idAvailable ? '✓ 사용 가능한 아이디입니다.' : '✗ 이미 사용 중인 아이디입니다.'}
              </Text>
            )}
          </Form.Item>

          {/* 이름 */}
          <Form.Item
            label="이름"
            name="userName"
            rules={[{ required: true, message: '이름을 입력해주세요.' }, { max: 10 }]}
          >
            <Input prefix={<UserOutlined style={{ color: '#bbb' }} />} placeholder="이름" />
          </Form.Item>

          {/* 비밀번호 */}
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                label="비밀번호"
                name="password"
                rules={[
                  { required: true, message: '비밀번호를 입력해주세요.' },
                  { min: 8, message: '8자 이상 입력해주세요.' },
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: '#bbb' }} />}
                  placeholder="8자 이상"
                  autoComplete="new-password"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="비밀번호 확인"
                name="passwordConfirm"
                dependencies={['password']}
                rules={[
                  { required: true, message: '비밀번호를 한 번 더 입력해주세요.' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('password') === value) return Promise.resolve();
                      return Promise.reject(new Error('비밀번호가 일치하지 않습니다.'));
                    },
                  }),
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: '#bbb' }} />}
                  placeholder="비밀번호 재입력"
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
                // 자동 하이픈 삽입
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
              id="signup-addressDetail"
              prefix={<HomeOutlined style={{ color: '#bbb' }} />}
              placeholder="동/호수, 건물명 등 상세 주소"
              maxLength={50}
            />
          </Form.Item>

          {/* 제출 버튼 */}
          <Form.Item style={{ marginTop: 8, marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" size="large" block loading={submitting}>
              가입 완료
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
