from django.core.management.base import BaseCommand
from employees.models import Hub
from decimal import Decimal

class Command(BaseCommand):
    help = 'Seed J&T Quezon hubs with accurate coordinates'

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Delete all existing hubs first',
        )

    def handle(self, *args, **options):
        if options['reset']:
            Hub.objects.all().delete()
            self.stdout.write(self.style.WARNING('Deleted all existing hubs'))

        hubs_data = [
            {
                'name': 'J&T Express Candelaria DH',
                'location': 'Candelaria',
                'city': 'Quezon',
                'company': 'J&T Express',
                'address': 'Rev Avenue, Candelaria, Quezon',
                'latitude': 13.9300,
                'longitude': 121.4305
            },
            {
                'name': 'J&T Express Candelaria DH2',
                'location': 'Candelaria',
                'city': 'Quezon',
                'company': 'J&T Express',
                'address': 'Nandres Subdivision, Gate 1, Malabanan Norte, Candelaria, Quezon',
                'latitude': 13.9320,
                'longitude': 121.4285
            },
            {
                'name': 'J&T Express Lucena DH 5',
                'location': 'Lucena',
                'city': 'Quezon',
                'company': 'J&T Express',
                'address': 'Diversion Road, Lucena City, Quezon',
                'latitude': 13.9515,
                'longitude': 121.6025
            },
            {
                'name': 'J&T Express Lucena DH2',
                'location': 'Lucena',
                'city': 'Quezon',
                'company': 'J&T Express',
                'address': 'Maharlika Highway, Red-V, Lucena City, Quezon',
                'latitude': 13.9385,
                'longitude': 121.6254
            },
            {
                'name': 'J&T Express Lucena DH3',
                'location': 'Lucena',
                'city': 'Quezon',
                'company': 'J&T Express',
                'address': 'Enverga St. corner Allarey St., Brgy. III, Lucena City, Quezon',
                'latitude': 13.9312,
                'longitude': 121.6158
            },
            {
                'name': 'J&T Express Lucena DH4',
                'location': 'Lucena',
                'city': 'Quezon',
                'company': 'J&T Express',
                'address': 'Merchan Corner Lakandula St., Brgy. 9, Lucena City, Quezon',
                'latitude': 13.9305,
                'longitude': 121.6138
            },
            {
                'name': 'J&T Express Lucena Hub Del Center',
                'location': 'Lucena',
                'city': 'Quezon',
                'company': 'J&T Express',
                'address': 'Brgy. Isabang, Lucena City, Quezon',
                'latitude': 13.9486,
                'longitude': 121.5796
            },
            {
                'name': 'J&T Express San Antonio DH',
                'location': 'San Antonio',
                'city': 'Quezon',
                'company': 'J&T Express',
                'address': 'Poblacion, San Antonio, Quezon',
                'latitude': 13.8961,
                'longitude': 121.2925
            },
            {
                'name': 'J&T Express Sariaya DH1',
                'location': 'Sariaya',
                'city': 'Quezon',
                'company': 'J&T Express',
                'address': 'General Luna St, Sariaya, Quezon',
                'latitude': 13.9632,
                'longitude': 121.5235
            },
            {
                'name': 'J&T Express Sariaya DH2',
                'location': 'Sariaya',
                'city': 'Quezon',
                'company': 'J&T Express',
                'address': 'Brgy. Sto. Cristo, Sariaya, Quezon',
                'latitude': 13.9678,
                'longitude': 121.5284
            },
            {
                'name': 'J&T Express Sariaya DH3',
                'location': 'Sariaya',
                'city': 'Quezon',
                'company': 'J&T Express',
                'address': 'Brgy. Concepcion Banahaw, Sariaya, Quezon',
                'latitude': 13.9725,
                'longitude': 121.5195
            },
            {
                'name': 'J&T Express Tiaong DH',
                'location': 'Tiaong',
                'city': 'Quezon',
                'company': 'J&T Express',
                'address': 'Lalig, Tiaong, Quezon',
                'latitude': 13.9625,
                'longitude': 121.3245
            },
            {
                'name': 'J&T Express Tiaong DH2',
                'location': 'Tiaong',
                'city': 'Quezon',
                'company': 'J&T Express',
                'address': 'Brgy. Lumingon, Tiaong, Quezon',
                'latitude': 13.9582,
                'longitude': 121.3195
            },
        ]

        created = 0
        updated = 0
        for data in hubs_data:
            hub, new = Hub.objects.update_or_create(
                name=data['name'],
                defaults=data
            )
            if new:
                created += 1
            else:
                updated += 1

        self.stdout.write(
            self.style.SUCCESS(f'Successfully seeded/updated {len(hubs_data)} J&T Quezon hubs ({created} created, {updated} updated)')
        )
