/**
 * India states/UTs with cities, for cascading State -> City select dropdowns.
 * Covers every district headquarters/notable city per state + UT - this is
 * the standard practical "complete" list used by business registration
 * forms (India doesn't have a single authoritative exhaustive list of every
 * town/village; district-level coverage is the accepted standard). Extend
 * per-state arrays below if you need a specific smaller town added.
 */
export const INDIA_STATES_CITIES = {
  'Andhra Pradesh': [
    'Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Kurnool', 'Rajahmundry', 'Tirupati', 'Kadapa', 'Kakinada',
    'Anantapur', 'Vizianagaram', 'Eluru', 'Ongole', 'Nandyal', 'Machilipatnam', 'Adoni', 'Tenali', 'Proddatur',
    'Chittoor', 'Hindupur', 'Srikakulam', 'Bhimavaram', 'Madanapalle', 'Guntakal', 'Dharmavaram', 'Gudivada',
    'Narasaraopet', 'Tadepalligudem', 'Tadipatri', 'Chilakaluripet', 'Amaravati', 'Palasa', 'Rajampet',
  ],
  'Arunachal Pradesh': [
    'Itanagar', 'Naharlagun', 'Pasighat', 'Tawang', 'Ziro', 'Along', 'Bomdila', 'Tezu', 'Changlang', 'Khonsa',
    'Roing', 'Yingkiong', 'Daporijo', 'Seppa', 'Anini', 'Namsai', 'Longding', 'Basar',
  ],
  'Assam': [
    'Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat', 'Nagaon', 'Tinsukia', 'Tezpur', 'Bongaigaon', 'Karimganj',
    'Sivasagar', 'Diphu', 'Goalpara', 'Barpeta', 'North Lakhimpur', 'Dhubri', 'Golaghat', 'Kokrajhar',
    'Hailakandi', 'Morigaon', 'Nalbari', 'Rangia', 'Mangaldoi', 'Haflong', 'Dhemaji', 'Sonitpur',
  ],
  'Bihar': [
    'Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Darbhanga', 'Purnia', 'Arrah', 'Begusarai', 'Katihar',
    'Munger', 'Chapra', 'Bettiah', 'Saharsa', 'Sasaram', 'Hajipur', 'Dehri', 'Siwan', 'Motihari',
    'Nawada', 'Bagaha', 'Buxar', 'Kishanganj', 'Sitamarhi', 'Jamalpur', 'Jehanabad', 'Aurangabad',
    'Gopalganj', 'Madhubani', 'Samastipur', 'Bihar Sharif', 'Araria', 'Supaul', 'Banka', 'Lakhisarai',
    'Sheohar', 'Sheikhpura', 'Khagaria', 'Madhepura', 'Vaishali', 'Jamui', 'Kaimur', 'Rohtas',
  ],
  'Chhattisgarh': [
    'Raipur', 'Bhilai', 'Bilaspur', 'Korba', 'Durg', 'Rajnandgaon', 'Jagdalpur', 'Ambikapur', 'Raigarh',
    'Dhamtari', 'Mahasamund', 'Kanker', 'Kawardha', 'Janjgir', 'Dantewada', 'Kondagaon', 'Balod',
    'Bemetara', 'Baloda Bazar', 'Gariaband', 'Sukma', 'Bijapur', 'Narayanpur', 'Surajpur', 'Balrampur',
    'Koriya', 'Mungeli', 'Jashpur',
  ],
  'Goa': ['Panaji', 'Margao', 'Vasco da Gama', 'Mapusa', 'Ponda', 'Bicholim', 'Curchorem', 'Cuncolim', 'Canacona', 'Pernem', 'Sanguem', 'Quepem'],
  'Gujarat': [
    'Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar', 'Gandhinagar', 'Junagadh', 'Anand',
    'Nadiad', 'Morbi', 'Mehsana', 'Bharuch', 'Vapi', 'Navsari', 'Veraval', 'Porbandar', 'Godhra',
    'Bhuj', 'Patan', 'Palanpur', 'Valsad', 'Himatnagar', 'Botad', 'Amreli', 'Dahod', 'Surendranagar',
    'Gandhidham', 'Ankleshwar', 'Deesa', 'Jetpur', 'Gondal', 'Idar', 'Kalol', 'Modasa', 'Vyara',
    'Chhota Udepur', 'Rajpipla', 'Lunawada',
  ],
  'Haryana': [
    'Gurugram', 'Faridabad', 'Panipat', 'Ambala', 'Hisar', 'Karnal', 'Rohtak', 'Sonipat', 'Yamunanagar',
    'Panchkula', 'Bhiwani', 'Sirsa', 'Bahadurgarh', 'Jind', 'Thanesar', 'Kaithal', 'Rewari', 'Palwal',
    'Fatehabad', 'Gohana', 'Narnaul', 'Mahendragarh', 'Charkhi Dadri', 'Jhajjar', 'Nuh', 'Pehowa', 'Hansi',
  ],
  'Himachal Pradesh': [
    'Shimla', 'Dharamshala', 'Solan', 'Mandi', 'Kullu', 'Manali', 'Bilaspur', 'Hamirpur', 'Una',
    'Chamba', 'Kangra', 'Nahan', 'Palampur', 'Sundarnagar', 'Kinnaur', 'Lahaul and Spiti', 'Nurpur', 'Baddi',
  ],
  'Jharkhand': [
    'Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro', 'Deoghar', 'Hazaribagh', 'Giridih', 'Ramgarh', 'Phusro',
    'Chaibasa', 'Chatra', 'Dumka', 'Godda', 'Gumla', 'Koderma', 'Latehar', 'Lohardaga', 'Pakur',
    'Palamu', 'Sahibganj', 'Simdega', 'Jamtara', 'Khunti', 'Garhwa', 'Seraikela Kharsawan', 'West Singhbhum',
  ],
  'Karnataka': [
    'Bengaluru', 'Mysuru', 'Hubballi', 'Mangaluru', 'Belagavi', 'Kalaburagi', 'Davanagere', 'Shivamogga',
    'Tumakuru', 'Ballari', 'Vijayapura', 'Raichur', 'Bidar', 'Hospet', 'Hassan', 'Gadag', 'Udupi',
    'Robertsonpet', 'Bhadravati', 'Chitradurga', 'Kolar', 'Mandya', 'Chikkamagaluru', 'Gangavati', 'Bagalkot',
    'Ranebennuru', 'Yadgir', 'Koppal', 'Haveri', 'Chamarajanagar', 'Kodagu (Madikeri)', 'Karwar (Uttara Kannada)',
    'Ramanagara', 'Chikkaballapur', 'Dakshina Kannada',
  ],
  'Kerala': [
    'Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur', 'Kollam', 'Kannur', 'Alappuzha', 'Palakkad',
    'Kottayam', 'Malappuram', 'Kasaragod', 'Pathanamthitta', 'Idukki', 'Ernakulam', 'Wayanad', 'Munnar',
    'Thalassery', 'Payyanur', 'Manjeri', 'Perinthalmanna', 'Ponnani', 'Guruvayur', 'Chalakudy', 'Neyyattinkara',
  ],
  'Madhya Pradesh': [
    'Bhopal', 'Indore', 'Jabalpur', 'Gwalior', 'Ujjain', 'Sagar', 'Dewas', 'Satna', 'Ratlam',
    'Rewa', 'Murwara (Katni)', 'Singrauli', 'Burhanpur', 'Khandwa', 'Bhind', 'Chhindwara', 'Guna',
    'Shivpuri', 'Vidisha', 'Chhatarpur', 'Damoh', 'Mandsaur', 'Khargone', 'Neemuch', 'Pithampur',
    'Hoshangabad (Narmadapuram)', 'Itarsi', 'Sehore', 'Morena', 'Betul', 'Seoni', 'Datia', 'Balaghat',
    'Panna', 'Tikamgarh', 'Shahdol', 'Mandla', 'Dindori', 'Umaria', 'Anuppur', 'Sidhi', 'Ashoknagar',
    'Raisen', 'Rajgarh', 'Shajapur', 'Agar Malwa', 'Dhar', 'Jhabua', 'Alirajpur', 'Barwani', 'Harda',
  ],
  'Maharashtra': [
    'Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Thane', 'Aurangabad (Chhatrapati Sambhajinagar)', 'Solapur',
    'Kolhapur', 'Amravati', 'Navi Mumbai', 'Kalyan-Dombivli', 'Vasai-Virar', 'Sangli', 'Malegaon', 'Jalgaon',
    'Akola', 'Latur', 'Dhule', 'Ahmednagar', 'Chandrapur', 'Parbhani', 'Ichalkaranji', 'Jalna', 'Bhiwandi',
    'Nanded', 'Satara', 'Beed', 'Yavatmal', 'Osmanabad (Dharashiv)', 'Wardha', 'Nandurbar', 'Buldhana',
    'Gondia', 'Washim', 'Hingoli', 'Ratnagiri', 'Sindhudurg', 'Raigad', 'Palghar', 'Gadchiroli', 'Panvel',
    'Ulhasnagar', 'Pimpri-Chinchwad', 'Baramati', 'Karad',
  ],
  'Manipur': [
    'Imphal', 'Thoubal', 'Bishnupur', 'Churachandpur', 'Kakching', 'Senapati', 'Ukhrul', 'Chandel',
    'Tamenglong', 'Jiribam', 'Noney', 'Pherzawl', 'Kangpokpi', 'Tengnoupal', 'Kamjong',
  ],
  'Meghalaya': ['Shillong', 'Tura', 'Jowai', 'Nongstoin', 'Baghmara', 'Williamnagar', 'Nongpoh', 'Mairang', 'Resubelpara', 'Ampati', 'Khliehriat', 'Mawkyrwat'],
  'Mizoram': ['Aizawl', 'Lunglei', 'Champhai', 'Serchhip', 'Kolasib', 'Lawngtlai', 'Mamit', 'Saiha', 'Khawzawl', 'Hnahthial', 'Saitual'],
  'Nagaland': ['Kohima', 'Dimapur', 'Mokokchung', 'Wokha', 'Zunheboto', 'Tuensang', 'Mon', 'Phek', 'Peren', 'Kiphire', 'Longleng', 'Noklak'],
  'Odisha': [
    'Bhubaneswar', 'Cuttack', 'Rourkela', 'Berhampur', 'Sambalpur', 'Puri', 'Balasore', 'Bhadrak',
    'Baripada', 'Jharsuguda', 'Jeypore', 'Angul', 'Dhenkanal', 'Keonjhar', 'Rayagada', 'Kendrapara',
    'Bargarh', 'Paradip', 'Bhawanipatna', 'Koraput', 'Balangir', 'Nabarangpur', 'Sundargarh', 'Nayagarh',
    'Jajpur', 'Ganjam', 'Boudh', 'Deogarh', 'Gajapati', 'Jagatsinghpur', 'Kalahandi', 'Kandhamal',
    'Malkangiri', 'Nuapada', 'Subarnapur', 'Khordha',
  ],
  'Punjab': [
    'Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda', 'Mohali', 'Hoshiarpur', 'Batala',
    'Pathankot', 'Moga', 'Abohar', 'Malerkotla', 'Khanna', 'Phagwara', 'Muktsar', 'Barnala',
    'Rajpura', 'Firozpur', 'Kapurthala', 'Zirakpur', 'Kot Kapura', 'Faridkot', 'Sangrur', 'Nawanshahr (Shahid Bhagat Singh Nagar)',
    'Gurdaspur', 'Mansa', 'Tarn Taran', 'Fatehgarh Sahib', 'Rupnagar',
  ],
  'Rajasthan': [
    'Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Ajmer', 'Bikaner', 'Alwar', 'Bhilwara', 'Sikar',
    'Bharatpur', 'Pali', 'Sri Ganganagar', 'Kishangarh', 'Baran', 'Dhaulpur', 'Tonk', 'Beawar',
    'Hanumangarh', 'Churu', 'Jhunjhunu', 'Nagaur', 'Barmer', 'Jaisalmer', 'Sawai Madhopur', 'Banswara',
    'Dungarpur', 'Chittorgarh', 'Rajsamand', 'Bundi', 'Jhalawar', 'Karauli', 'Sirohi', 'Pratapgarh',
    'Dausa', 'Baran', 'Nagaur',
  ],
  'Sikkim': ['Gangtok', 'Namchi', 'Gyalshing', 'Mangan', 'Pakyong', 'Soreng', 'Rangpo', 'Singtam', 'Jorethang'],
  'Tamil Nadu': [
    'Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli', 'Erode', 'Vellore',
    'Thoothukudi', 'Dindigul', 'Thanjavur', 'Ranipet', 'Sivakasi', 'Karur', 'Udhagamandalam (Ooty)',
    'Hosur', 'Nagercoil', 'Kanchipuram', 'Kumbakonam', 'Tiruppur', 'Cuddalore', 'Rajapalayam', 'Pudukkottai',
    'Namakkal', 'Krishnagiri', 'Ramanathapuram', 'Virudhunagar', 'Theni', 'Sivaganga', 'Perambalur',
    'Ariyalur', 'Nilgiris', 'Villupuram', 'Tiruvannamalai', 'Nagapattinam', 'Tiruvarur', 'Kanyakumari',
    'Dharmapuri', 'Tirupathur', 'Kallakurichi', 'Chengalpattu', 'Mayiladuthurai',
  ],
  'Telangana': [
    'Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar', 'Khammam', 'Ramagundam', 'Secunderabad',
    'Mahbubnagar', 'Nalgonda', 'Adilabad', 'Siddipet', 'Miryalaguda', 'Suryapet', 'Jagtial',
    'Mancherial', 'Sangareddy', 'Medak', 'Vikarabad', 'Wanaparthy', 'Nagarkurnool', 'Kamareddy',
    'Bhadradri Kothagudem', 'Jangaon', 'Jayashankar Bhupalpally', 'Jogulamba Gadwal', 'Kumuram Bheem Asifabad',
    'Mahabubabad', 'Medchal-Malkajgiri', 'Peddapalli', 'Rajanna Sircilla', 'Rangareddy', 'Yadadri Bhuvanagiri',
  ],
  'Tripura': ['Agartala', 'Udaipur', 'Dharmanagar', 'Kailashahar', 'Belonia', 'Khowai', 'Ambassa', 'Kamalpur', 'Sabroom', 'Sonamura', 'Teliamura'],
  'Uttar Pradesh': [
    'Lucknow', 'Kanpur', 'Ghaziabad', 'Agra', 'Varanasi', 'Meerut', 'Prayagraj', 'Noida', 'Bareilly',
    'Aligarh', 'Moradabad', 'Saharanpur', 'Gorakhpur', 'Faizabad (Ayodhya)', 'Jhansi', 'Muzaffarnagar',
    'Mathura', 'Rampur', 'Shahjahanpur', 'Farrukhabad', 'Mau', 'Hapur', 'Etawah', 'Mirzapur',
    'Bulandshahr', 'Sambhal', 'Amroha', 'Hardoi', 'Fatehpur', 'Raebareli', 'Orai', 'Sitapur',
    'Bahraich', 'Modinagar', 'Unnao', 'Jaunpur', 'Lakhimpur', 'Hathras', 'Banda', 'Pilibhit',
    'Barabanki', 'Khurja', 'Gonda', 'Mainpuri', 'Auraiya', 'Etah', 'Deoria', 'Basti', 'Ghazipur',
    'Sultanpur', 'Azamgarh', 'Bijnor', 'Budaun', 'Chandausi', 'Firozabad', 'Greater Noida', 'Kannauj',
    'Kushinagar', 'Pratapgarh', 'Rae Bareli', 'Shamli', 'Siddharthnagar', 'Sonbhadra', 'Ballia',
    'Chitrakoot', 'Kanpur Dehat', 'Kasganj', 'Amethi', 'Ambedkar Nagar', 'Baghpat', 'Balrampur',
    'Bhadohi (Sant Ravidas Nagar)', 'Chandauli', 'Hamirpur', 'Hathras', 'Jalaun', 'Kaushambi',
    'Mahoba', 'Sant Kabir Nagar', 'Shravasti',
  ],
  'Uttarakhand': [
    'Dehradun', 'Haridwar', 'Roorkee', 'Haldwani', 'Rudrapur', 'Nainital', 'Kashipur', 'Rishikesh',
    'Ramnagar', 'Pithoragarh', 'Almora', 'Pauri', 'Srinagar', 'Kotdwar', 'Mussoorie', 'Tehri',
    'Bageshwar', 'Champawat', 'Chamoli', 'Rudraprayag', 'Udham Singh Nagar', 'Uttarkashi', 'Vikasnagar',
  ],
  'West Bengal': [
    'Kolkata', 'Howrah', 'Durgapur', 'Asansol', 'Siliguri', 'Bardhaman', 'Malda', 'Baharampur',
    'Habra', 'Kharagpur', 'Shantipur', 'Krishnanagar', 'Nabadwip', 'Medinipur', 'Jalpaiguri', 'Balurghat',
    'Basirhat', 'Bankura', 'Chakdaha', 'Darjeeling', 'Alipurduar', 'Purulia', 'Jangipur', 'Raiganj',
    'Kalimpong', 'Cooch Behar', 'Suri', 'Tamluk', 'Contai', 'Haldia', 'Ranaghat', 'Bongaon',
    'Diamond Harbour', 'Jhargram', 'Birbhum (Suri)', 'Uttar Dinajpur', 'Dakshin Dinajpur', 'Nadia',
    'Murshidabad', 'Hooghly (Chinsurah)', 'North 24 Parganas (Barasat)', 'South 24 Parganas (Alipore)',
  ],
  'Andaman and Nicobar Islands': ['Port Blair', 'Diglipur', 'Mayabunder', 'Rangat', 'Car Nicobar', 'Little Andaman', 'Havelock Island'],
  'Chandigarh': ['Chandigarh'],
  'Dadra and Nagar Haveli and Daman and Diu': ['Daman', 'Diu', 'Silvassa', 'Naroli', 'Amli'],
  'Delhi': [
    'New Delhi', 'North Delhi', 'South Delhi', 'East Delhi', 'West Delhi', 'North West Delhi',
    'South West Delhi', 'North East Delhi', 'South East Delhi', 'Central Delhi', 'Shahdara',
    'Dwarka', 'Rohini', 'Pitampura', 'Janakpuri', 'Saket', 'Vasant Kunj', 'Karol Bagh', 'Lajpat Nagar',
    'Connaught Place', 'Mayur Vihar', 'Narela', 'Najafgarh', 'Okhla',
  ],
  'Jammu and Kashmir': [
    'Srinagar', 'Jammu', 'Anantnag', 'Baramulla', 'Sopore', 'Kathua', 'Udhampur', 'Punch (Poonch)',
    'Rajouri', 'Kupwara', 'Pulwama', 'Kulgam', 'Budgam', 'Bandipora', 'Ganderbal', 'Shopian',
    'Doda', 'Kishtwar', 'Ramban', 'Reasi', 'Samba',
  ],
  'Ladakh': ['Leh', 'Kargil', 'Nubra', 'Zanskar', 'Diskit'],
  'Lakshadweep': ['Kavaratti', 'Agatti', 'Amini', 'Andrott', 'Minicoy', 'Kalpeni'],
  'Puducherry': ['Puducherry', 'Karaikal', 'Mahe', 'Yanam', 'Ozhukarai', 'Villianur'],
};

export const INDIA_STATES = Object.keys(INDIA_STATES_CITIES).sort();

export const getCitiesForState = (state) => INDIA_STATES_CITIES[state] || [];

export default INDIA_STATES_CITIES;
