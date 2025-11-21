exports.isAuthenticated = (req, res, next) => {
    if (req.session && req.session.user) {
        return next();
    }
    res.redirect('/');
};

exports.isAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') { 
        return next();
    }
    
    res.status(403).send("Доступ заборонено"); 
};