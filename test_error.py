def calculate_division(a, b):
    # This will cause a ZeroDivisionError if b is 0
    return a / b

def process_data(data):
    # This will cause a KeyError if 'id' is missing
    return data['id']

if __name__ == "__main__":
    try:
        print(calculate_division(10, 0))
    except Exception as e:
        print("Traceback (most recent call last):")
        print('  File "test_error.py", line 4, in calculate_division')
        print('    return a / b')
        print("ZeroDivisionError: division by zero")

    try:
        process_data({"name": "DebugAI"})
    except Exception as e:
        print("\nTraceback (most recent call last):")
        print('  File "test_error.py", line 8, in process_data')
        print("    return data['id']")
        print("KeyError: 'id'")
