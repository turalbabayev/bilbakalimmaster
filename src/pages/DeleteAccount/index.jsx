import React, { useState } from 'react';
import { Container, Form, Button, Card, Alert } from 'react-bootstrap';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

const DeleteAccountPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();
  const auth = getAuth();
  const functions = getFunctions();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Önce kullanıcıyı giriş yaptır
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // ID token al
      const idToken = await user.getIdToken();

      // Cloud Function'ı çağır
      const deleteAccount = httpsCallable(functions, 'deleteAccount');
      await deleteAccount({ idToken });

      toast.success('Hesabınız başarıyla silindi.');
      navigate('/');
    } catch (error) {
      console.error('Hesap silme hatası:', error);
      setError('Hesap silinirken bir hata oluştu: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="py-5">
      <Card className="mx-auto" style={{ maxWidth: '500px' }}>
        <Card.Header className="bg-danger text-white">
          <h4 className="mb-0">Hesap Silme</h4>
        </Card.Header>
        <Card.Body>
          <Alert variant="warning">
            <Alert.Heading>Önemli Uyarı!</Alert.Heading>
            <p>
              Bu işlem geri alınamaz. Hesabınız ve tüm verileriniz kalıcı olarak silinecektir.
              Devam etmeden önce lütfen bu kararınızdan emin olun.
            </p>
          </Alert>

          {error && <Alert variant="danger">{error}</Alert>}

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>E-posta Adresi</Form.Label>
              <Form.Control
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="E-posta adresinizi girin"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Şifre</Form.Label>
              <Form.Control
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Şifrenizi girin"
              />
            </Form.Group>

            <div className="d-grid gap-2">
              <Button
                variant="danger"
                type="submit"
                disabled={loading || !email || !password}
              >
                {loading ? 'İşlem Yapılıyor...' : 'Hesabımı Kalıcı Olarak Sil'}
              </Button>
              <Button
                variant="secondary"
                onClick={() => navigate('/')}
                disabled={loading}
              >
                İptal Et
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default DeleteAccountPage; 