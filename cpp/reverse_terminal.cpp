#include <string>
#include <sstream>
#include <cctype>
#include <algorithm>
#include <emscripten/emscripten.h>
using namespace std;

// return a pointer to this buffer, must stay alive after function exists
static string OUT;

static string trim(const string& s) {
    size_t a = 0;
    while (a < s.size() && isspace((unsigned char)s[a])) a++;
    size_t b = s.size();
    while (b > a && isspace((unsigned char)s[b - 1])) b--;
    return s.substr(a, b - a);
}

static bool starts_with(const string& s, const string& p) {
    return s.size() >= p.size() && s.compare(0, p.size(), p) == 0;
}

extern "C" {

// Javascript will call this once per input line
EMSCRIPTEN_KEEPALIVE
const char* handleLine(const char* input_c) {
    string input = trim(input_c ? input_c : "");

    if (input == "help") {
        OUT =
            "Commands:\n"
            "  help\n"
            "  reverse <int>\n"
            "  Example:\n"
            "  reverse 12345\n";
        return OUT.c_str();
    }

    if (starts_with(input, "reverse ")) {
        string num = trim(input.substr(8));

        // just reversing characters
        if (num.size() >= 2 && num[0] == '-') {
            reverse(num.begin() + 1, num.end());
        }
        else {
            reverse(num.begin(), num.end());
        }

        OUT = "Result: " + num;
        return OUT.c_str();
    }

    OUT = "Unknown command. Type `help`.";
    return OUT.c_str();
}

}   // extern "C"
