from flask import Flask, jsonify
import datetime

app = Flask(__name__)

@app.route('/')
def root():
    print("🎯 SIMPLE ROOT ROUTE CALLED!")
    return jsonify({
        "message": "🚀 SIMPLE TEST - API IS WORKING!",
        "timestamp": datetime.datetime.utcnow().isoformat()
    })

@app.route('/api/health')
def health():
    return jsonify({"status": "healthy"})

if __name__ == '__main__':
    print("🚀 Starting SIMPLE test server on port 5001...")
    app.run(debug=True, port=5001, host='0.0.0.0')