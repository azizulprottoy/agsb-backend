const { asyncRouter } = require('../utils/asyncRouter');
const productController = require('../controllers/productController');
const productCategoryController = require('../controllers/productCategoryController');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { uploadProduct, uploadProductCategory, MAX_PRODUCT_IMAGES } = require('../middleware/upload');

module.exports = (collections) => {
  const router = asyncRouter();
  const products = productController(collections);
  const categories = productCategoryController(collections);
  const images = uploadProduct.array('images', MAX_PRODUCT_IMAGES);

  router.get('/product-categories', categories.getCategories);
  router.post('/product-categories', verifyToken, requireAdmin, uploadProductCategory.single('image'), categories.addCategory);
  router.put('/product-categories/:id', verifyToken, requireAdmin, uploadProductCategory.single('image'), categories.editCategory);
  router.delete('/product-categories/:id', verifyToken, requireAdmin, categories.deleteCategory);

  router.get('/products', products.getProducts);
  // Declared before '/products/:slug'.
  router.get('/products/admin', verifyToken, requireAdmin, products.getAllProducts);
  router.get('/products/:slug', products.getProductBySlug);
  router.post('/products', verifyToken, requireAdmin, images, products.addProduct);
  router.put('/products/:id', verifyToken, requireAdmin, images, products.editProduct);
  router.delete('/products/:id', verifyToken, requireAdmin, products.deleteProduct);

  return router;
};
