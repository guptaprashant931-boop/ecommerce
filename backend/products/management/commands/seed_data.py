from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from products.models import Category, Product
from decimal import Decimal

User = get_user_model()


class Command(BaseCommand):
    help = 'Seed database with sample data'

    def handle(self, *args, **kwargs):
        self.stdout.write('Seeding database...')

        # Create admin user
        if not User.objects.filter(username='admin').exists():
            User.objects.create_superuser(
                username='admin',
                email='admin@shop.com',
                password='admin123',
                role='admin',
                phone='9999999999',
            )
            self.stdout.write(self.style.SUCCESS('✓ Admin user created (admin / admin123)'))

        # Create customer user
        if not User.objects.filter(username='customer1').exists():
            user = User(username='customer1', email='customer@shop.com', role='customer')
            user.set_password('customer123')
            user.save()
            self.stdout.write(self.style.SUCCESS('✓ Customer user created (customer1 / customer123)'))

        # Create categories
        categories_data = [
            ('Electronics', 'Phones, laptops, gadgets'),
            ('Clothing', 'Men and women fashion'),
            ('Books', 'Educational and fiction books'),
            ('Home & Kitchen', 'Appliances and cookware'),
            ('Sports', 'Fitness and outdoor equipment'),
        ]
        categories = {}
        for name, desc in categories_data:
            cat, created = Category.objects.get_or_create(name=name, defaults={'description': desc})
            categories[name] = cat
        self.stdout.write(self.style.SUCCESS('✓ Categories created'))

        # Create products
        products_data = [
            ('iPhone 15', 'Latest Apple smartphone with A16 chip', Decimal('79999'), 25, 'Electronics'),
            ('Samsung Galaxy S24', 'Android flagship with 200MP camera', Decimal('64999'), 30, 'Electronics'),
            ('MacBook Air M2', '13-inch laptop with Apple Silicon', Decimal('114900'), 10, 'Electronics'),
            ('Sony WH-1000XM5', 'Noise cancelling wireless headphones', Decimal('24990'), 50, 'Electronics'),
            ('Dell XPS 15', '15-inch OLED display laptop', Decimal('145000'), 8, 'Electronics'),
            ('Men\'s Cotton T-Shirt', 'Comfortable daily wear, available in S/M/L/XL', Decimal('499'), 200, 'Clothing'),
            ('Women\'s Kurta Set', 'Elegant ethnic wear for occasions', Decimal('1299'), 150, 'Clothing'),
            ('Denim Jeans', 'Slim fit blue denim, stretchable', Decimal('1799'), 100, 'Clothing'),
            ('Python Crash Course', 'Learn Python programming from scratch', Decimal('599'), 75, 'Books'),
            ('Clean Code', 'A Handbook of Agile Software Craftsmanship by Robert Martin', Decimal('899'), 60, 'Books'),
            ('System Design Interview', 'An insider\'s guide to system design interviews', Decimal('1299'), 40, 'Books'),
            ('Instant Pot Duo', '7-in-1 electric pressure cooker 5.7L', Decimal('8999'), 35, 'Home & Kitchen'),
            ('Air Fryer 4L', 'Healthy cooking with less oil', Decimal('3499'), 45, 'Home & Kitchen'),
            ('Yoga Mat', 'Non-slip 6mm thick exercise mat', Decimal('799'), 80, 'Sports'),
            ('Dumbbell Set 20kg', 'Adjustable weight training set', Decimal('2999'), 20, 'Sports'),
        ]

        for name, desc, price, stock, cat_name in products_data:
            Product.objects.get_or_create(
                name=name,
                defaults={
                    'description': desc,
                    'price': price,
                    'stock': stock,
                    'category': categories[cat_name],
                    'is_active': True,
                }
            )
        self.stdout.write(self.style.SUCCESS('✓ 15 products created'))
        self.stdout.write(self.style.SUCCESS('\n✅ Database seeded successfully!'))
        self.stdout.write('   Admin: admin / admin123')
        self.stdout.write('   Customer: customer1 / customer123')