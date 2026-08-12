-- Rename the default business name from Vybz to JANE DOE CAFE.

alter table business_settings alter column business_name set default 'JANE DOE CAFE';

update business_settings
set business_name = 'JANE DOE CAFE'
where business_name = 'Vybz';
