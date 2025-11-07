const { useState } = React;

function ProfileSettings() {
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    age: '',
    gender: '',
    weightGoal: '',
    bpTarget: '',
    sugarRange: '',
    weightUnit: 'kg',
    heightUnit: 'cm',
    glucoseUnit: 'mg/dL',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const saveProfile = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });

      const data = await res.json();
      alert(data.message || 'Profile saved!');
    } catch (err) {
      alert('Error saving profile');
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white shadow-md rounded-xl p-6 space-y-6">
      <h1 className="text-2xl font-bold">Profile & Settings</h1>

      {/* Profile Info */}
      <section>
        <h2 className="text-xl font-semibold mb-2">Profile Information</h2>
        <div className="grid gap-4">
          <input name="name" placeholder="Name" className="input" value={profile.name} onChange={handleChange} />
          <input name="email" placeholder="Email" className="input" value={profile.email} onChange={handleChange} />
          <input name="age" placeholder="Age" className="input" value={profile.age} onChange={handleChange} />
          <input name="gender" placeholder="Gender" className="input" value={profile.gender} onChange={handleChange} />
        </div>
      </section>

      {/* Health Goals */}
      <section>
        <h2 className="text-xl font-semibold mb-2">Health Goals</h2>
        <div className="grid gap-4">
          <input name="weightGoal" placeholder="Weight Goal (e.g. 55 kg)" className="input" value={profile.weightGoal} onChange={handleChange} />
          <input name="bpTarget" placeholder="Blood Pressure Target (e.g. 120/80)" className="input" value={profile.bpTarget} onChange={handleChange} />
          <input name="sugarRange" placeholder="Sugar Level Range (e.g. 90-120)" className="input" value={profile.sugarRange} onChange={handleChange} />
        </div>
      </section>

      {/* Preferred Units */}
      <section>
        <h2 className="text-xl font-semibold mb-2">Preferred Units</h2>
        <div className="grid gap-4">
          <select name="weightUnit" value={profile.weightUnit} onChange={handleChange} className="p-2 border rounded">
            <option value="kg">Kilograms (kg)</option>
            <option value="lbs">Pounds (lbs)</option>
          </select>
          <select name="heightUnit" value={profile.heightUnit} onChange={handleChange} className="p-2 border rounded">
            <option value="cm">Centimeters (cm)</option>
            <option value="ft">Feet/Inches</option>
          </select>
          <select name="glucoseUnit" value={profile.glucoseUnit} onChange={handleChange} className="p-2 border rounded">
            <option value="mg/dL">mg/dL</option>
            <option value="mmol/L">mmol/L</option>
          </select>
        </div>
      </section>

      {/* Export + Save */}
      <section className="flex justify-between items-center">
        <div className="flex gap-4">
          <button onClick={() => alert('Exporting PDF...')} className="bg-blue-500 text-white px-4 py-2 rounded">Export PDF</button>
          <button onClick={() => alert('Exporting CSV...')} className="bg-green-500 text-white px-4 py-2 rounded">Export CSV</button>
        </div>
        <button onClick={saveProfile} className="bg-indigo-600 text-white px-6 py-2 rounded shadow-md">Save Changes</button>
      </section>
    </div>
  );
}

ReactDOM.render(<ProfileSettings />, document.getElementById('root'));
