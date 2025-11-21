const authMiddleware = require('../middleware/auth-middleware');

describe('Auth Middleware Unit Tests', () => {
    
    // Потрібно "підробити" (замокати) функції res.redirect та next,
    // щоб перевірити, чи були вони викликані.
    let req, res, next;

    beforeEach(() => {
        // Скидаємо налаштування перед кожним тестом
        req = { session: {} };
        res = {
            redirect: jest.fn(),      // Шпигун для redirect
            status: jest.fn().mockReturnThis(), // Шпигун для status (дозволяє ланцюжок .send)
            send: jest.fn()           // Шпигун для send
        };
        next = jest.fn();             // Шпигун для next()
    });

    // --- Тести для isAuthenticated ---

    test('isAuthenticated: should call next() if user is logged in', () => {
        // 1. Симулюємо авторизованого юзера
        req.session.user = { id: 1 };

        // 2. Викликаємо middleware
        authMiddleware.isAuthenticated(req, res, next);

        // 3. Перевіряємо: чи викликалась next()? ТАК
        expect(next).toHaveBeenCalled();
        // Перевіряємо: чи викликався redirect? НІ
        expect(res.redirect).not.toHaveBeenCalled();
    });

    test('isAuthenticated: should redirect to / if user is NOT logged in', () => {
        // 1. Симулюємо гостя (user undefined)
        req.session.user = undefined;

        authMiddleware.isAuthenticated(req, res, next);

        // 2. Перевіряємо: next() НЕ мав викликатись
        expect(next).not.toHaveBeenCalled();
        // 3. Перевіряємо: redirect('/') МАВ викликатись
        expect(res.redirect).toHaveBeenCalledWith('/');
    });


    // --- Тести для isAdmin ---

    test('isAdmin: should call next() if user role is admin', () => {
        // 1. Симулюємо Адміна
        req.session.user = { role: 'admin' };

        authMiddleware.isAdmin(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });

    test('isAdmin: should return 403 if user role is user', () => {
        // 1. Симулюємо Звичайного юзера
        req.session.user = { role: 'user' };

        authMiddleware.isAdmin(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.send).toHaveBeenCalledWith("Доступ заборонено");
    });
    
    test('isAdmin: should return 403 if no user session', () => {
        // 1. Симулюємо ситуацію без сесії (на всяк випадок)
        req.session.user = undefined;

        authMiddleware.isAdmin(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
    });

});